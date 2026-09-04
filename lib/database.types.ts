// Hand-written to match supabase/migrations/*.sql. If the schema drifts from
// this, regenerate with:
//   npx supabase gen types typescript --db-url "$DATABASE_URL" --schema menagerie

export type WorkspaceType = "household" | "organization";
export type MembershipRole = "owner" | "caregiver" | "viewer";
export type MembershipStatus = "invited" | "active" | "removed";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type RosterKind = "pet" | "group" | "habitat";
export type IllnessStatus = "active" | "resolved";
export type VaccinationStatus = "due" | "scheduled" | "complete";
export type PetSex = "male" | "female" | "unknown";
export type ServiceProviderCategory = "vet" | "grooming" | "offline_shop" | "online_shop";

// The polymorphic pet_id/group_id/habitat_id scope shared by stat_entries,
// vet_visits, illnesses, vaccinations, and grooming_visits (§03) — exactly
// one is non-null, enforced by a DB check constraint.
type Scope = {
  pet_id: string | null;
  group_id: string | null;
  habitat_id: string | null;
};

type Table<Row, RequiredInsert extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsert>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  menagerie: {
    Views: Record<string, never>;
    Tables: {
      plans: Table<
        {
          code: string;
          name: string;
          stripe_price_id_monthly: string | null;
          stripe_price_id_annual: string | null;
          price_monthly_inr: number | null;
          pet_limit: number | null;
          seat_limit: number | null;
          location_limit: number | null;
        },
        "code" | "name"
      >;
      tenants: Table<
        {
          id: string;
          name: string;
          workspace_type: WorkspaceType;
          plan_code: string;
          trial_ends_at: string | null;
          created_at: string;
        },
        "name"
      >;
      memberships: Table<
        {
          id: string;
          tenant_id: string;
          user_id: string | null;
          invited_email: string;
          role: MembershipRole;
          status: MembershipStatus;
          created_at: string;
        },
        "tenant_id" | "invited_email"
      >;
      subscriptions: Table<
        {
          id: string;
          tenant_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: SubscriptionStatus;
          current_period_end: string | null;
          created_at: string;
        },
        "tenant_id"
      >;
      pets: Table<
        {
          id: string;
          tenant_id: string;
          group_id: string | null;
          name: string;
          species: string;
          breed: string | null;
          sex: PetSex | null;
          birth_date: string | null;
          life_stage: string | null;
          weight_kg: number | null;
          color: string | null;
          microchip_id: string | null;
          neutered: boolean | null;
          notes: string | null;
          is_adoptable: boolean;
          adoption_note: string | null;
          photo_path: string | null;
          created_at: string;
        },
        "tenant_id" | "name" | "species"
      >;
      pet_groups: Table<
        {
          id: string;
          tenant_id: string;
          name: string;
          species: string | null;
          notes: string | null;
          photo_path: string | null;
          created_at: string;
        },
        "tenant_id" | "name"
      >;
      habitats: Table<
        {
          id: string;
          tenant_id: string;
          name: string;
          habitat_type: string;
          capacity_note: string | null;
          notes: string | null;
          photo_path: string | null;
          created_at: string;
        },
        "tenant_id" | "name" | "habitat_type"
      >;
      stat_entries: Table<
        {
          id: string;
          tenant_id: string;
          stat_type: string;
          value: number | null;
          unit: string | null;
          note: string | null;
          recorded_at: string;
        } & Scope,
        "tenant_id" | "stat_type"
      >;
      service_providers: Table<
        {
          id: string;
          tenant_id: string;
          category: ServiceProviderCategory;
          name: string;
          phone: string | null;
          address: string | null;
          website: string | null;
          notes: string | null;
          created_at: string;
        },
        "tenant_id" | "category" | "name"
      >;
      vet_visits: Table<
        {
          id: string;
          tenant_id: string;
          provider_id: string | null;
          visit_date: string;
          reason: string;
          cost: number | null;
          notes: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "reason"
      >;
      illnesses: Table<
        {
          id: string;
          tenant_id: string;
          reason: string;
          status: IllnessStatus;
          diagnosed_date: string;
          resolved_date: string | null;
          notes: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "reason"
      >;
      vaccinations: Table<
        {
          id: string;
          tenant_id: string;
          reason: string;
          status: VaccinationStatus;
          due_date: string | null;
          administered_date: string | null;
          notes: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "reason"
      >;
      grooming_visits: Table<
        {
          id: string;
          tenant_id: string;
          provider_id: string | null;
          service: string;
          visit_date: string;
          cost: number | null;
          notes: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "service"
      >;
      products: Table<
        {
          id: string;
          tenant_id: string;
          name: string;
          category: string | null;
          notes: string | null;
          image_path: string | null;
          created_at: string;
        },
        "tenant_id" | "name"
      >;
      shopping_orders: Table<
        {
          id: string;
          tenant_id: string;
          product_id: string;
          provider_id: string | null;
          order_date: string;
          delivered_date: string | null;
          item_url: string | null;
          qty: number | null;
          qty_unit: string | null;
          cost: number | null;
          notes: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "product_id"
      >;
      care_tasks: Table<
        {
          id: string;
          tenant_id: string;
          title: string;
          due_date: string | null;
          repeat_interval_days: number | null;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "title"
      >;
      media: Table<
        {
          id: string;
          tenant_id: string;
          storage_path: string;
          caption: string | null;
          uploaded_by: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "storage_path"
      >;
      comments: Table<
        {
          id: string;
          tenant_id: string;
          media_id: string;
          author_id: string | null;
          body: string;
          created_at: string;
        },
        "tenant_id" | "media_id" | "body"
      >;
    };
    Functions: {
      accept_pending_invites: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
    };
  };
}
