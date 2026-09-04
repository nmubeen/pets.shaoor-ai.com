// Hand-written to match supabase/migrations/*.sql. If the schema drifts from
// this, regenerate with:
//   npx supabase gen types typescript --db-url "$DATABASE_URL" --schema menagerie

export type WorkspaceType = "household" | "organization";
export type MembershipRole = "owner" | "caregiver" | "viewer";
export type MembershipStatus = "invited" | "active" | "removed";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type RosterKind = "pet" | "group" | "habitat";

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
          life_stage: string | null;
          notes: string | null;
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
          created_at: string;
        },
        "tenant_id" | "name" | "habitat_type"
      >;
      stat_entries: Table<
        {
          id: string;
          tenant_id: string;
          pet_id: string | null;
          group_id: string | null;
          habitat_id: string | null;
          stat_type: string;
          value: number | null;
          unit: string | null;
          note: string | null;
          recorded_at: string;
        },
        "tenant_id" | "stat_type"
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
