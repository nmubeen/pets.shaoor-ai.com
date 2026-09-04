// Hand-written to match supabase/migrations/*.sql. If the schema drifts from
// this, regenerate with:
//   npx supabase gen types typescript --db-url "$DATABASE_URL" --schema menagerie

export type WorkspaceType = "household" | "organization";
export type MembershipRole = "owner" | "caregiver" | "viewer";
export type MembershipStatus = "invited" | "active" | "removed";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type RosterKind = "pet" | "habitat";
export type IllnessStatus = "active" | "resolved";
export type VaccinationStatus = "due" | "scheduled" | "complete";
export type PetSex = "male" | "female" | "unknown";
export type ServiceProviderCategory = "vet" | "grooming" | "offline_shop" | "online_shop";
export type SpeciesGroup = "dog" | "cat" | "bird" | "reptile" | "fish" | "small_mammal" | "other";
export type MedicationStatus = "active" | "completed" | "discontinued";

// The polymorphic pet_id/habitat_id scope shared by stat_entries,
// vet_visits, illnesses, vaccinations, grooming_visits, and medications
// (§03) — exactly one is non-null, enforced by a DB check constraint.
// Groups used to be a third scope option here; per the 0015 redesign a
// group is a saved collection of pets, not a subject of its own, so it's
// never a scope target — see pet_group_members below.
type Scope = {
  pet_id: string | null;
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
          razorpay_plan_id_monthly: string | null;
          razorpay_plan_id_annual: string | null;
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
          razorpay_customer_id: string | null;
          razorpay_subscription_id: string | null;
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
          species_group: SpeciesGroup | null;
          created_at: string;
        },
        "tenant_id" | "name" | "species"
      >;
      pet_groups: Table<
        {
          id: string;
          tenant_id: string;
          name: string;
          photo_path: string | null;
          created_at: string;
        },
        "tenant_id" | "name"
      >;
      pet_group_members: Table<
        {
          id: string;
          tenant_id: string;
          group_id: string;
          pet_id: string;
          created_at: string;
        },
        "tenant_id" | "group_id" | "pet_id"
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
          logo_path: string | null;
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
          protocol_id: string | null;
          reason: string;
          status: VaccinationStatus;
          due_date: string | null;
          administered_date: string | null;
          notes: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "reason"
      >;
      vaccine_protocols: Table<
        {
          id: string;
          species_group: SpeciesGroup;
          vaccine_name: string;
          dose_sequence: number;
          age_weeks_due: number;
          booster_interval_months: number | null;
          is_core: boolean;
          notes: string | null;
          created_at: string;
        },
        "species_group" | "vaccine_name" | "age_weeks_due"
      >;
      medications: Table<
        {
          id: string;
          tenant_id: string;
          provider_id: string | null;
          name: string;
          dosage: string | null;
          frequency_days: number;
          start_date: string;
          end_date: string | null;
          next_due_date: string;
          status: MedicationStatus;
          notes: string | null;
          created_at: string;
        } & Scope,
        "tenant_id" | "name"
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
