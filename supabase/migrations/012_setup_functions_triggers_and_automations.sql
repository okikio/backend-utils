-- ============================================================================
-- Migration 012: Functions and Triggers
-- Business logic and automation
-- ============================================================================
-- FIXES: Username generation bug, dollar sign syntax, search_path security
-- ============================================================================


-- ############################################################################
-- SECTION 1: UTILITY FUNCTIONS
-- ############################################################################

-- Updated_at trigger function (reusable across tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- ############################################################################
-- SECTION 2: AUTH/PROFILE FUNCTIONS
-- ############################################################################

-- Auto-create profile on user signup
-- FIXED: Proper username generation from OAuth providers
-- FIXED: Ensures uniqueness with counter suffix if needed
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INT := 0;
BEGIN
    -- Extract base username from OAuth metadata or email
    base_username := COALESCE(
        -- Try full_name first (most OAuth providers)
        NEW.raw_user_meta_data->>'full_name',
        -- Fall back to name
        NEW.raw_user_meta_data->>'name',
        -- Last resort: email username part
        split_part(NEW.email, '@', 1)
    );
    
    -- Sanitize: lowercase, replace spaces/special chars with underscores
    base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g'));
    
    -- Trim consecutive underscores and trim to 20 chars max
    base_username := regexp_replace(base_username, '_+', '_', 'g');
    base_username := left(base_username, 20);
    
    -- Remove leading/trailing underscores
    base_username := trim(both '_' from base_username);
    
    -- Ensure not empty (fallback to user_ + uuid prefix)
    IF base_username = '' OR base_username IS NULL THEN
        base_username := 'user_' || substr(NEW.id::text, 1, 8);
    END IF;
    
    -- Ensure uniqueness by appending counter if needed
    final_username := base_username;
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := base_username || '_' || counter;
    END LOOP;
    
    -- Insert profile with sanitized username
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
        NEW.id,
        final_username,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            final_username  -- Use username if no display name available
        )
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();


-- ############################################################################
-- SECTION 3: PRODUCT/REVIEW FUNCTIONS
-- ############################################################################

-- Update product rating averages when reviews change
CREATE OR REPLACE FUNCTION update_product_rating_avg()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.products
        SET 
            rating_avg = (
                SELECT AVG(rating)
                FROM public.reviews
                WHERE target_type_code = 'product'
                AND target_id = NEW.target_id::text
                AND deleted_at IS NULL
                AND moderation_status_code = 'approved'
            ),
            rating_count = (
                SELECT COUNT(*)
                FROM public.reviews
                WHERE target_type_code = 'product'
                AND target_id = NEW.target_id::text
                AND deleted_at IS NULL
                AND moderation_status_code = 'approved'
            ),
            review_count = (
                SELECT COUNT(*)
                FROM public.reviews
                WHERE target_type_code = 'product'
                AND target_id = NEW.target_id::text
                AND deleted_at IS NULL
                AND moderation_status_code = 'approved'
            )
        WHERE id = NEW.target_id::uuid;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_product_ratings_trigger
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW
    WHEN (NEW.target_type_code = 'product')
    EXECUTE FUNCTION update_product_rating_avg();


-- ############################################################################
-- SECTION 4: COLLECTION FUNCTIONS
-- ############################################################################

-- Update collection like count
-- NOTE: Cannot use TG_OP in WHEN clause, only in function body
CREATE OR REPLACE FUNCTION update_collection_like_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.collections
        SET like_count = like_count + 1
        WHERE id = NEW.target_id::uuid;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.collections
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = OLD.target_id::uuid;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Separate triggers for INSERT and DELETE
CREATE TRIGGER update_collection_likes_insert_trigger
    AFTER INSERT ON public.likes
    FOR EACH ROW
    WHEN (NEW.target_type_code = 'collection')
    EXECUTE FUNCTION update_collection_like_count();

CREATE TRIGGER update_collection_likes_delete_trigger
    AFTER DELETE ON public.likes
    FOR EACH ROW
    WHEN (OLD.target_type_code = 'collection')
    EXECUTE FUNCTION update_collection_like_count();

-- Log collection changes
CREATE OR REPLACE FUNCTION log_collection_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.collection_history (
            collection_id,
            action,
            changed_by_user_id,
            snapshot
        ) VALUES (
            NEW.id,
            'created',
            NEW.owner_id,
            to_jsonb(NEW)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log if something significant changed
        IF OLD.name IS DISTINCT FROM NEW.name
           OR OLD.description IS DISTINCT FROM NEW.description
           OR OLD.visibility_code IS DISTINCT FROM NEW.visibility_code
           OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
            INSERT INTO public.collection_history (
                collection_id,
                action,
                changed_by_user_id,
                snapshot
            ) VALUES (
                NEW.id,
                CASE 
                    WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'deleted'
                    WHEN OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN 'restored'
                    ELSE 'updated'
                END,
                COALESCE(NEW.deleted_by_user_id, NEW.owner_id),
                to_jsonb(NEW)
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER collection_change_logger
    AFTER INSERT OR UPDATE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION log_collection_change();

-- Restore collection (undelete)
CREATE OR REPLACE FUNCTION restore_collection(collection_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user owns the collection
    IF NOT EXISTS (
        SELECT 1 FROM public.collections 
        WHERE id = collection_id 
        AND owner_id = auth.uid()
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Restore the collection
    UPDATE public.collections
    SET 
        deleted_at = NULL,
        deleted_by_user_id = NULL,
        updated_at = NOW()
    WHERE id = collection_id;
    
    RETURN TRUE;
END;
$$;


-- ############################################################################
-- SECTION 5: SUBSCRIPTION FUNCTIONS
-- ############################################################################

-- Sync Stripe subscription to profile tier
CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    product_metadata JSONB;
BEGIN
    SELECT sp.metadata INTO product_metadata
    FROM public.stripe_products sp
    WHERE sp.id = NEW.stripe_product_id;
    
    UPDATE public.profiles
    SET 
        subscription_tier_code = COALESCE(
            product_metadata->>'tier_code',
            'free'
        ),
        subscription_expires_at = NEW.current_period_end,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER sync_subscription_trigger
    AFTER INSERT OR UPDATE ON public.stripe_subscriptions
    FOR EACH ROW
    WHEN (NEW.status IN ('trialing', 'active'))
    EXECUTE FUNCTION sync_subscription_to_profile();


-- ############################################################################
-- SECTION 6: ORDER FUNCTIONS
-- ############################################################################

-- Track order status changes
CREATE OR REPLACE FUNCTION track_order_status_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status_code IS DISTINCT FROM NEW.status_code THEN
        INSERT INTO public.order_status_history (
            order_id,
            from_status_code,
            to_status_code,
            changed_by_system
        ) VALUES (
            NEW.id,
            OLD.status_code,
            NEW.status_code,
            'trigger'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER track_order_status_trigger
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION track_order_status_change();


-- ############################################################################
-- SECTION 7: CART FUNCTIONS
-- ############################################################################

-- Merge guest cart to authenticated user cart
CREATE OR REPLACE FUNCTION merge_guest_cart(
    p_session_id TEXT,
    p_user_id UUID
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_cart_id UUID;
    v_guest_cart_id UUID;
    v_items_merged INT := 0;
BEGIN
    -- Get guest cart
    SELECT id INTO v_guest_cart_id
    FROM public.carts
    WHERE session_id = p_session_id 
    AND user_id IS NULL
    AND converted_to_order_id IS NULL
    LIMIT 1;
    
    IF v_guest_cart_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'items_merged', 0
        );
    END IF;
    
    -- Get or create user's cart
    SELECT id INTO v_user_cart_id
    FROM public.carts
    WHERE user_id = p_user_id 
    AND converted_to_order_id IS NULL
    LIMIT 1;
    
    IF v_user_cart_id IS NULL THEN
        INSERT INTO public.carts (user_id)
        VALUES (p_user_id)
        RETURNING id INTO v_user_cart_id;
    END IF;
    
    -- Merge cart items (sum quantities for duplicates)
    WITH merged AS (
        INSERT INTO public.cart_items (cart_id, sku_id, quantity, price_cents)
        SELECT 
            v_user_cart_id,
            ci.sku_id,
            ci.quantity,
            ci.price_cents
        FROM public.cart_items ci
        WHERE ci.cart_id = v_guest_cart_id
        ON CONFLICT (cart_id, sku_id) DO UPDATE
        SET 
            quantity = public.cart_items.quantity + EXCLUDED.quantity,
            updated_at = NOW()
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_items_merged FROM merged;
    
    -- Transfer inventory reservations
    UPDATE public.inventory_reservations
    SET cart_id = v_user_cart_id
    WHERE cart_id = v_guest_cart_id
    AND released_at IS NULL;
    
    -- Mark guest cart as converted
    UPDATE public.carts 
    SET converted_to_order_id = v_user_cart_id
    WHERE id = v_guest_cart_id;
    
    -- Update user cart activity
    UPDATE public.carts
    SET last_activity_at = NOW()
    WHERE id = v_user_cart_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'items_merged', v_items_merged
    );
END;
$$;


-- ############################################################################
-- SECTION 8: CLEANUP FUNCTIONS
-- ############################################################################

-- Release expired cart reservations
CREATE OR REPLACE FUNCTION release_expired_cart_reservations()
RETURNS VOID
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.inventory_reservations
    SET released_at = NOW()
    WHERE released_at IS NULL
    AND reserved_until < NOW()
    AND cart_id IS NOT NULL;
END;
$$;

-- Mark abandoned carts
CREATE OR REPLACE FUNCTION mark_abandoned_carts()
RETURNS VOID
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.carts
    SET abandoned_at = NOW()
    WHERE abandoned_at IS NULL
    AND converted_to_order_id IS NULL
    AND last_activity_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Hard delete old soft-deleted records
CREATE OR REPLACE FUNCTION cleanup_old_deleted_records()
RETURNS VOID
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete comments soft-deleted over 90 days ago
    DELETE FROM public.comments
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '90 days';
    
    -- Delete reviews soft-deleted over 180 days ago
    DELETE FROM public.reviews
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '180 days';
    
    -- Delete collections soft-deleted over 1 year ago
    DELETE FROM public.collections
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 year';
    
    RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$;


-- ############################################################################
-- SECTION 9: PULL LIST HELPER FUNCTIONS
-- ############################################################################

-- Calculate user's spend for a given week
CREATE OR REPLACE FUNCTION get_pull_list_week_spend(
    p_user_id UUID,
    p_release_week DATE
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_cents INT;
    v_item_count INT;
BEGIN
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN pli.sku_id IS NOT NULL THEN s.price_cents * pli.quantity
                ELSE p.base_price_cents * pli.quantity
            END
        ), 0),
        COUNT(*)
    INTO v_total_cents, v_item_count
    FROM public.pull_list_items pli
    JOIN public.products p ON pli.product_id = p.id
    LEFT JOIN public.skus s ON pli.sku_id = s.id
    WHERE pli.user_id = p_user_id
    AND pli.release_week = p_release_week
    AND pli.status_code IN ('pending', 'reserved');
    
    RETURN jsonb_build_object(
        'total_cents', v_total_cents,
        'item_count', v_item_count,
        'currency', 'USD'
    );
END;
$$;

-- Get character appearance count for user's collection
CREATE OR REPLACE FUNCTION get_character_appearance_count(
    p_user_id UUID,
    p_character_uri TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
    v_preferences JSONB;
    v_count INT;
BEGIN
    -- Get user's tracking preferences
    SELECT preferences INTO v_preferences
    FROM public.user_character_tracking
    WHERE user_id = p_user_id;
    
    -- Default preferences if not set
    IF v_preferences IS NULL THEN
        v_preferences := '{
            "counting_method": "by_comic",
            "role_types": ["main", "supporting", "cameo"],
            "separate_personas": false
        }'::jsonb;
    END IF;
    
    -- Count based on method
    WITH user_products AS (
        SELECT product_id FROM public.user_product_state
        WHERE user_id = p_user_id
        AND purchased_at IS NOT NULL
    )
    SELECT 
        CASE 
            WHEN (v_preferences->>'counting_method') = 'by_story' 
            THEN COUNT(DISTINCT (pca.product_id, pca.story_id))
            ELSE COUNT(DISTINCT pca.product_id)
        END
    INTO v_count
    FROM public.character_appearances pca
    JOIN user_products up ON pca.product_id = up.product_id
    WHERE pca.character_uri = p_character_uri
    AND pca.role_type = ANY(
        SELECT jsonb_array_elements_text(v_preferences->'role_types')
    );
    
    RETURN jsonb_build_object(
        'total_count', COALESCE(v_count, 0),
        'character_uri', p_character_uri,
        'counting_method', v_preferences->>'counting_method'
    );
END;
$$;


-- ############################################################################
-- SECTION 10: UPDATED_AT TRIGGERS
-- ############################################################################

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skus_updated_at BEFORE UPDATE ON public.skus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pull_list_items_updated_at BEFORE UPDATE ON public.pull_list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_character_tracking_updated_at BEFORE UPDATE ON public.user_character_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ############################################################################
-- END OF MIGRATION
-- ############################################################################