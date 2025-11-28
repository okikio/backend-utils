-- ============================================================================
-- Migration 015: Row Level Security Policies
-- ============================================================================
-- Comprehensive RLS policies that respect:
--   • Profile privacy settings (public/private/friends_only)
--   • Collection visibility settings
--   • Soft-deleted content
--   • Moderation status
--   • Activity visibility preferences
--
-- NOTE: Helper functions are in PUBLIC schema (not auth) because migrations
--       don't have permission to create functions in the auth schema.
-- ============================================================================


-- ############################################################################
-- HELPER FUNCTIONS FOR RLS (in public schema)
-- ############################################################################

-- Check if current user follows target user (for friends_only visibility)
CREATE OR REPLACE FUNCTION public.rls_is_following(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_follows
    WHERE user_id = auth.uid()
    AND target_type_code = 'user'
    AND target_id = target_user_id::text
    AND unfollowed_at IS NULL
  );
$$;

-- Check if profile is visible to current user based on privacy settings
CREATE OR REPLACE FUNCTION public.rls_can_view_profile(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT 
    CASE 
      -- Always see own profile
      WHEN profile_id = auth.uid() THEN TRUE
      -- Check privacy settings
      ELSE (
        SELECT 
          CASE COALESCE(p.privacy->>'profile_visibility', 'public')
            WHEN 'public' THEN TRUE
            WHEN 'private' THEN FALSE
            WHEN 'friends_only' THEN public.rls_is_following(profile_id)
            ELSE TRUE  -- Default to public
          END
        FROM public.profiles p
        WHERE p.id = profile_id
        AND p.status_code = 'active'
      )
    END;
$$;

-- Check if collection is visible to current user
CREATE OR REPLACE FUNCTION public.rls_can_view_collection(collection_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id
    AND c.deleted_at IS NULL
    AND (
      -- Owner always sees own collections
      c.owner_id = auth.uid()
      OR
      -- Public collections visible to all
      c.visibility_code = 'public'
      OR
      -- Unlisted visible if you have the link
      c.visibility_code = 'unlisted'
      OR
      -- Friends only - check if following owner
      (c.visibility_code = 'friends_only' AND public.rls_is_following(c.owner_id))
    )
  );
$$;

-- Check if user shows activity publicly
CREATE OR REPLACE FUNCTION public.rls_can_view_activity(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT 
    CASE
      WHEN target_user_id = auth.uid() THEN TRUE
      ELSE (
        SELECT 
          COALESCE((p.privacy->>'show_activity')::boolean, true)
          AND public.rls_can_view_profile(target_user_id)
        FROM public.profiles p
        WHERE p.id = target_user_id
      )
    END;
$$;

-- Grant execute to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.rls_is_following(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_can_view_profile(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_can_view_collection(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rls_can_view_activity(UUID) TO authenticated, anon;


-- ############################################################################
-- SECTION 1: REFERENCE TABLES (Public Read)
-- ############################################################################

-- Drop existing policies to avoid conflicts
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'product_mediums', 'product_formats', 'product_statuses', 'attributes',
    'attribute_options', 'profile_statuses', 'subscription_tiers',
    'moderation_statuses', 'collection_visibilities', 'order_statuses',
    'ownership_types', 'consumption_statuses', 'pull_list_statuses',
    'entity_types', 'character_role_types'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Reference tables are public" ON %I', tbl);
  END LOOP;
END $$;

-- Create policies
CREATE POLICY "Reference tables are public" ON product_mediums FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON product_formats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON product_statuses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON attribute_options FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON profile_statuses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON subscription_tiers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON moderation_statuses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON collection_visibilities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON order_statuses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON ownership_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON consumption_statuses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON pull_list_statuses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON entity_types FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Reference tables are public" ON character_role_types FOR SELECT TO anon, authenticated USING (true);


-- ############################################################################
-- SECTION 2: PROFILES
-- ############################################################################

-- Own profile always visible
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Public profiles
CREATE POLICY "profiles_select_public"
ON profiles FOR SELECT
TO anon, authenticated
USING (
  status_code = 'active'
  AND COALESCE(privacy->>'profile_visibility', 'public') = 'public'
);

-- Friends-only profiles
CREATE POLICY "profiles_select_friends"
ON profiles FOR SELECT
TO authenticated
USING (
  status_code = 'active'
  AND (privacy->>'profile_visibility') = 'friends_only'
  AND public.rls_is_following(id)
);

-- Update own profile
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND status_code IN ('active', 'deactivated')
);


-- ############################################################################
-- SECTION 3: PRODUCTS
-- ############################################################################

CREATE POLICY "products_select_active"
ON products FOR SELECT
TO anon, authenticated
USING (archived_at IS NULL AND status_code != 'archived');


-- ############################################################################
-- SECTION 4: SKUS
-- ############################################################################

CREATE POLICY "skus_select_available"
ON skus FOR SELECT
TO anon, authenticated
USING (
  (available_until IS NULL OR available_until > NOW())
  AND EXISTS (
    SELECT 1 FROM products p 
    WHERE p.id = product_id 
    AND p.archived_at IS NULL
  )
);

CREATE POLICY "sku_attributes_select"
ON sku_attributes FOR SELECT
TO anon, authenticated
USING (true);


-- ############################################################################
-- SECTION 5: LIKES
-- ############################################################################

-- Own likes always visible
CREATE POLICY "likes_select_own"
ON likes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Likes on public content
CREATE POLICY "likes_select_public"
ON likes FOR SELECT
TO anon, authenticated
USING (
  target_type_code = 'product'
  OR target_id LIKE 'http%'
);

-- Likes on visible collections
CREATE POLICY "likes_select_collections"
ON likes FOR SELECT
TO authenticated
USING (
  target_type_code = 'collection'
  AND public.rls_can_view_collection(target_id::uuid)
);

-- Likes on visible profiles
CREATE POLICY "likes_select_users"
ON likes FOR SELECT
TO authenticated
USING (
  target_type_code = 'user'
  AND public.rls_can_view_profile(target_id::uuid)
);

CREATE POLICY "likes_insert"
ON likes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "likes_delete"
ON likes FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 6: COMMENTS
-- ############################################################################

CREATE POLICY "comments_select_own"
ON comments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "comments_select_approved"
ON comments FOR SELECT
TO anon, authenticated
USING (
  deleted_at IS NULL
  AND moderation_status_code = 'approved'
  AND (
    target_type_code = 'product'
    OR target_id LIKE 'http%'
    OR (target_type_code = 'collection' AND public.rls_can_view_collection(target_id::uuid))
  )
);

CREATE POLICY "comments_insert"
ON comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND moderation_status_code = 'approved'
);

CREATE POLICY "comments_update_own"
ON comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND deleted_at IS NULL)
WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_delete_own"
ON comments FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 7: REVIEWS
-- ############################################################################

CREATE POLICY "reviews_select_own"
ON reviews FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "reviews_select_approved"
ON reviews FOR SELECT
TO anon, authenticated
USING (
  deleted_at IS NULL
  AND moderation_status_code = 'approved'
);

CREATE POLICY "reviews_insert"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND moderation_status_code = 'approved'
);

CREATE POLICY "reviews_update_own"
ON reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid() AND deleted_at IS NULL)
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reviews_delete_own"
ON reviews FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 8: REVIEW VOTES
-- ############################################################################

CREATE POLICY "review_votes_select"
ON review_votes FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "review_votes_insert"
ON review_votes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "review_votes_update"
ON review_votes FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "review_votes_delete"
ON review_votes FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 9: COLLECTIONS
-- ############################################################################

CREATE POLICY "collections_select_own"
ON collections FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "collections_select_public"
ON collections FOR SELECT
TO anon, authenticated
USING (
  deleted_at IS NULL
  AND visibility_code IN ('public', 'unlisted')
);

CREATE POLICY "collections_select_friends"
ON collections FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND visibility_code = 'friends_only'
  AND public.rls_is_following(owner_id)
);

CREATE POLICY "collections_insert"
ON collections FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "collections_update"
ON collections FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "collections_delete"
ON collections FOR DELETE
TO authenticated
USING (owner_id = auth.uid());


-- ############################################################################
-- SECTION 10: COLLECTION ITEMS
-- ############################################################################

CREATE POLICY "collection_items_select"
ON collection_items FOR SELECT
TO anon, authenticated
USING (public.rls_can_view_collection(collection_id));

CREATE POLICY "collection_items_insert"
ON collection_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM collections c
    WHERE c.id = collection_id
    AND c.owner_id = auth.uid()
    AND c.deleted_at IS NULL
  )
);

CREATE POLICY "collection_items_update"
ON collection_items FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.owner_id = auth.uid())
);

CREATE POLICY "collection_items_delete"
ON collection_items FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.owner_id = auth.uid())
);


-- ############################################################################
-- SECTION 11: COLLECTION HISTORY
-- ############################################################################

CREATE POLICY "collection_history_select"
ON collection_history FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id AND c.owner_id = auth.uid())
);


-- ############################################################################
-- SECTION 12: USER FOLLOWS
-- ############################################################################

CREATE POLICY "user_follows_select_own"
ON user_follows FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_follows_select_public"
ON user_follows FOR SELECT
TO anon, authenticated
USING (
  unfollowed_at IS NULL
  AND (
    target_type_code != 'user'
    OR public.rls_can_view_activity(user_id)
  )
);

CREATE POLICY "user_follows_insert"
ON user_follows FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_follows_update"
ON user_follows FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_follows_delete"
ON user_follows FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 13: PULL LIST
-- ############################################################################

CREATE POLICY "pull_list_select"
ON pull_list_items FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "pull_list_insert"
ON pull_list_items FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "pull_list_update"
ON pull_list_items FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "pull_list_delete"
ON pull_list_items FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 14: CHARACTER APPEARANCES
-- ############################################################################

CREATE POLICY "character_appearances_select"
ON character_appearances FOR SELECT
TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.archived_at IS NULL)
);


-- ############################################################################
-- SECTION 15: USER CHARACTER TRACKING
-- ############################################################################

CREATE POLICY "user_character_tracking_select"
ON user_character_tracking FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_character_tracking_insert"
ON user_character_tracking FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_character_tracking_update"
ON user_character_tracking FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ############################################################################
-- SECTION 16: USER PRODUCT STATE
-- ############################################################################

CREATE POLICY "user_product_state_select_own"
ON user_product_state FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_product_state_select_public"
ON user_product_state FOR SELECT
TO authenticated
USING (public.rls_can_view_activity(user_id));

CREATE POLICY "user_product_state_insert"
ON user_product_state FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_product_state_update"
ON user_product_state FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ############################################################################
-- SECTION 17: NOTIFICATIONS
-- ############################################################################

CREATE POLICY "notifications_select"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notifications_update"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_delete"
ON notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 18: CARTS
-- ############################################################################

CREATE POLICY "carts_select"
ON carts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "carts_insert"
ON carts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "carts_update"
ON carts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ############################################################################
-- SECTION 19: CART ITEMS
-- ############################################################################

CREATE POLICY "cart_items_select"
ON cart_items FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));

CREATE POLICY "cart_items_insert"
ON cart_items FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));

CREATE POLICY "cart_items_update"
ON cart_items FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));

CREATE POLICY "cart_items_delete"
ON cart_items FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));


-- ############################################################################
-- SECTION 20: ORDERS
-- ############################################################################

CREATE POLICY "orders_select"
ON orders FOR SELECT
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 21: ORDER ITEMS
-- ############################################################################

CREATE POLICY "order_items_select"
ON order_items FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid()));


-- ############################################################################
-- SECTION 22: ORDER STATUS HISTORY
-- ############################################################################

CREATE POLICY "order_status_history_select"
ON order_status_history FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid()));


-- ############################################################################
-- SECTION 23: PAYMENT TRANSACTIONS
-- ############################################################################

CREATE POLICY "payment_transactions_select"
ON payment_transactions FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.user_id = auth.uid()));


-- ############################################################################
-- SECTION 24: STRIPE
-- ############################################################################

CREATE POLICY "stripe_customers_select"
ON stripe_customers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "stripe_products_select"
ON stripe_products FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "stripe_prices_select"
ON stripe_prices FOR SELECT
TO anon, authenticated
USING (active = true);

CREATE POLICY "stripe_subscriptions_select"
ON stripe_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());


-- ############################################################################
-- SECTION 25: INVENTORY
-- ############################################################################

CREATE POLICY "inventory_reservations_select"
ON inventory_reservations FOR SELECT
TO authenticated
USING (
  cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  OR order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);


-- ############################################################################
-- END - No policies for admin tables (service_role only):
--   moderation_log, neptune_sync_events, neptune_sync_cursors
-- ############################################################################