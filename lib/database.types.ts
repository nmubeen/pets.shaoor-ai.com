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
export type Species = "dog" | "cat" | "bird" | "reptile" | "fish" | "small_mammal" | "other";
export type MedicationStatus = "active" | "completed" | "discontinued";

// The polymorphic pet_id/habitat_id scope — exactly one non-null, enforced
// by a DB check constraint. Used only by stat_entries (dead/unused) and
// care_tasks now — health records (visits, illnesses, vaccinations,
// medications) went pet-only (0017_scope_rework.sql), and shopping_orders
// moved to a many-to-many join table (shopping_order_scopes, below)
// instead of this shape entirely.
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
      // species (dog/cat/bird/...) and breed (free text, e.g. "Labrador")
      // were renamed from species_group and the old free-text species
      // column respectively (0022_rename_species_breed.sql) — the old
      // pair (species as free text + a separate optional breed) was
      // confusing since both described "what kind of animal", just at
      // different specificity; now species is the one structured,
      // required field and breed the one free-text, required field.
      pets: Table<
        {
          id: string;
          tenant_id: string;
          name: string;
          species: Species;
          breed: string;
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
        "tenant_id" | "name" | "species" | "breed"
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
          email: string | null;
          address: string | null;
          website: string | null;
          notes: string | null;
          logo_path: string | null;
          location_url: string | null;
          business_hours: string | null;
          created_at: string;
        },
        "tenant_id" | "category" | "name"
      >;
      // Renamed from vet_visits (0020_unified_visits.sql) — a visit can now
      // carry any mix of services (visit_services) and vaccinations given
      // (vaccinations.visit_id), not just a medical checkup; grooming_visits
      // was folded in rather than kept as a separate table. cost is the sum
      // of that visit's line items, computed and stored at write time
      // (lib/actions/health.ts), not a DB trigger.
      visits: Table<
        {
          id: string;
          tenant_id: string;
          pet_id: string;
          provider_id: string | null;
          visit_date: string;
          reason: string;
          vet_name: string | null;
          cost: number | null;
          weight_kg: number | null;
          notes: string | null;
          created_at: string;
        },
        "tenant_id" | "pet_id" | "reason"
      >;
      care_service_types: Table<
        {
          id: string;
          tenant_id: string;
          name: string;
          frequency_days: number | null;
          // null = applies to any species (generic); set = specific to
          // that species, tracked/reminded separately from the
          // same-named service for a different one (0021_service_type_species.sql).
          species: Species | null;
          created_at: string;
        },
        "tenant_id" | "name"
      >;
      visit_services: Table<
        {
          id: string;
          tenant_id: string;
          visit_id: string;
          service_type_id: string | null;
          name: string;
          cost: number | null;
          created_at: string;
        },
        "tenant_id" | "visit_id" | "name"
      >;
      illnesses: Table<
        {
          id: string;
          tenant_id: string;
          pet_id: string;
          visit_id: string | null;
          reason: string;
          status: IllnessStatus;
          diagnosed_date: string;
          resolved_date: string | null;
          notes: string | null;
          created_at: string;
        },
        "tenant_id" | "pet_id" | "reason"
      >;
      vaccinations: Table<
        {
          id: string;
          tenant_id: string;
          pet_id: string;
          protocol_id: string | null;
          visit_id: string | null;
          provider_id: string | null;
          reason: string;
          status: VaccinationStatus;
          due_date: string | null;
          administered_date: string | null;
          cost: number | null;
          notes: string | null;
          created_at: string;
        },
        "tenant_id" | "pet_id" | "reason"
      >;
      // tenant_id null = global built-in reference row (dog/cat defaults,
      // read-only); tenant_id set = that workspace's own custom plan entry
      // (0020_unified_visits.sql) — see lib/vaccination-plans.ts.
      vaccine_protocols: Table<
        {
          id: string;
          tenant_id: string | null;
          species: Species;
          vaccine_name: string;
          dose_sequence: number;
          age_weeks_due: number;
          booster_interval_months: number | null;
          is_core: boolean;
          notes: string | null;
          created_at: string;
        },
        "species" | "vaccine_name" | "age_weeks_due"
      >;
      medications: Table<
        {
          id: string;
          tenant_id: string;
          pet_id: string;
          provider_id: string | null;
          visit_id: string | null;
          name: string;
          dosage: string | null;
          frequency_days: number;
          start_date: string;
          end_date: string | null;
          next_due_date: string;
          status: MedicationStatus;
          notes: string | null;
          created_at: string;
        },
        "tenant_id" | "pet_id" | "name"
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
        },
        "tenant_id" | "product_id"
      >;
      shopping_order_scopes: Table<
        {
          id: string;
          tenant_id: string;
          order_id: string;
          pet_id: string | null;
          habitat_id: string | null;
          created_at: string;
        },
        "tenant_id" | "order_id"
      >;
      // pet_id/habitat_id: exactly one required — see 0017_scope_rework.sql.
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
      // Moved to a many-to-many join table (media_scopes, below) instead of
      // the shared pet_id/habitat_id Scope shape (0023_gallery_multiscope_clicked_date.sql)
      // — a photo can tag any combination of pets/habitats, not just one.
      media: Table<
        {
          id: string;
          tenant_id: string;
          storage_path: string;
          caption: string | null;
          uploaded_by: string | null;
          clicked_date: string;
          created_at: string;
        },
        "tenant_id" | "storage_path"
      >;
      media_scopes: Table<
        {
          id: string;
          tenant_id: string;
          media_id: string;
          pet_id: string | null;
          habitat_id: string | null;
          created_at: string;
        },
        "tenant_id" | "media_id"
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
      sync_control_subscription: {
        Args: {
          p_tenant_id: string;
          p_tenant_name: string;
          p_owner_subject: string | null;
          p_owner_email: string | null;
          p_plan_code: string;
          p_status: string;
          p_trial_ends_at: string | null;
          p_current_period_start: string | null;
          p_current_period_end: string | null;
          p_reason: string;
          p_correlation_id: string;
        };
        Returns: Record<string, unknown>;
      };
    };
  };
}
