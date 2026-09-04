-- Switch billing from the disconnected Stripe scaffold to Razorpay
-- (India-first: UPI Autopay + cards/netbanking, and Stripe isn't onboarding
-- new India merchants). Same trust model as before -- the webhook is still
-- the only writer of subscription state -- just a different gateway's
-- object names.

alter table menagerie.subscriptions rename column stripe_customer_id to razorpay_customer_id;
alter table menagerie.subscriptions rename column stripe_subscription_id to razorpay_subscription_id;

alter table menagerie.plans rename column stripe_price_id_monthly to razorpay_plan_id_monthly;
alter table menagerie.plans rename column stripe_price_id_annual to razorpay_plan_id_annual;
