BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'SALES_REP',
    [active] BIT NOT NULL CONSTRAINT [users_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[customer_tiers] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [default_discount_percent] DECIMAL(5,2) NOT NULL CONSTRAINT [customer_tiers_default_discount_percent_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [customer_tiers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [customer_tiers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [customer_tiers_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[customers] (
    [id] NVARCHAR(1000) NOT NULL,
    [company_name] NVARCHAR(1000) NOT NULL,
    [contact_name] NVARCHAR(1000),
    [email] NVARCHAR(1000),
    [tier_id] NVARCHAR(1000),
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [customers_currency_df] DEFAULT 'INR',
    [active] BIT NOT NULL CONSTRAINT [customers_active_df] DEFAULT 1,
    [portal_user_id] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [customers_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [customers_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_categories] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [product_categories_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_categories_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_categories_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[products] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [sku] NVARCHAR(1000) NOT NULL,
    [category_id] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL CONSTRAINT [products_type_df] DEFAULT 'HARDWARE',
    [unit] NVARCHAR(1000) NOT NULL CONSTRAINT [products_unit_df] DEFAULT 'unit',
    [base_price] DECIMAL(14,2) NOT NULL,
    [cost_price] DECIMAL(14,2) NOT NULL,
    [tax_percent] DECIMAL(5,2) NOT NULL CONSTRAINT [products_tax_percent_df] DEFAULT 0,
    [description] NVARCHAR(1000),
    [active] BIT NOT NULL CONSTRAINT [products_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [products_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [products_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [products_sku_key] UNIQUE NONCLUSTERED ([sku])
);

-- CreateTable
CREATE TABLE [dbo].[price_lists] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [currency] NVARCHAR(1000) NOT NULL CONSTRAINT [price_lists_currency_df] DEFAULT 'INR',
    [active] BIT NOT NULL CONSTRAINT [price_lists_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [price_lists_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [price_lists_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[price_list_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [price_list_id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [price] DECIMAL(14,2) NOT NULL,
    CONSTRAINT [price_list_items_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [price_list_items_price_list_id_product_id_key] UNIQUE NONCLUSTERED ([price_list_id],[product_id])
);

-- CreateTable
CREATE TABLE [dbo].[discount_rules] (
    [id] NVARCHAR(1000) NOT NULL,
    [customer_tier_id] NVARCHAR(1000),
    [category_id] NVARCHAR(1000),
    [max_discount_percent] DECIMAL(5,2) NOT NULL,
    [priority] INT NOT NULL CONSTRAINT [discount_rules_priority_df] DEFAULT 0,
    [active] BIT NOT NULL CONSTRAINT [discount_rules_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [discount_rules_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [discount_rules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[approval_rules] (
    [id] NVARCHAR(1000) NOT NULL,
    [min_risk_score] INT NOT NULL,
    [max_risk_score] INT,
    [required_roles] NVARCHAR(1000) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [approval_rules_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [approval_rules_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [approval_rules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[subscription_plans] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [frequency] NVARCHAR(1000) NOT NULL CONSTRAINT [subscription_plans_frequency_df] DEFAULT 'MONTHLY',
    [price] DECIMAL(14,2) NOT NULL,
    [proration_enabled] BIT NOT NULL CONSTRAINT [subscription_plans_proration_enabled_df] DEFAULT 1,
    [cancellation_refund_enabled] BIT NOT NULL CONSTRAINT [subscription_plans_cancellation_refund_enabled_df] DEFAULT 1,
    [active] BIT NOT NULL CONSTRAINT [subscription_plans_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [subscription_plans_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [subscription_plans_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[quotes] (
    [id] NVARCHAR(1000) NOT NULL,
    [quote_number] NVARCHAR(1000) NOT NULL,
    [customer_id] NVARCHAR(1000) NOT NULL,
    [sales_rep_id] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [quotes_status_df] DEFAULT 'DRAFT',
    [subtotal] DECIMAL(14,2) NOT NULL CONSTRAINT [quotes_subtotal_df] DEFAULT 0,
    [discount_amount] DECIMAL(14,2) NOT NULL CONSTRAINT [quotes_discount_amount_df] DEFAULT 0,
    [total] DECIMAL(14,2) NOT NULL CONSTRAINT [quotes_total_df] DEFAULT 0,
    [margin_amount] DECIMAL(14,2) NOT NULL CONSTRAINT [quotes_margin_amount_df] DEFAULT 0,
    [margin_percent] DECIMAL(6,2) NOT NULL CONSTRAINT [quotes_margin_percent_df] DEFAULT 0,
    [risk_score] INT NOT NULL CONSTRAINT [quotes_risk_score_df] DEFAULT 0,
    [risk_level] NVARCHAR(1000) NOT NULL CONSTRAINT [quotes_risk_level_df] DEFAULT 'LOW',
    [portal_token] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [quotes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [quotes_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [quotes_quote_number_key] UNIQUE NONCLUSTERED ([quote_number]),
    CONSTRAINT [quotes_portal_token_key] UNIQUE NONCLUSTERED ([portal_token])
);

-- CreateTable
CREATE TABLE [dbo].[quote_lines] (
    [id] NVARCHAR(1000) NOT NULL,
    [quote_id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [quantity] DECIMAL(12,2) NOT NULL,
    [unit_price] DECIMAL(14,2) NOT NULL,
    [discount_percent] DECIMAL(5,2) NOT NULL CONSTRAINT [quote_lines_discount_percent_df] DEFAULT 0,
    [discount_amount] DECIMAL(14,2) NOT NULL CONSTRAINT [quote_lines_discount_amount_df] DEFAULT 0,
    [line_total] DECIMAL(14,2) NOT NULL CONSTRAINT [quote_lines_line_total_df] DEFAULT 0,
    [margin_amount] DECIMAL(14,2) NOT NULL CONSTRAINT [quote_lines_margin_amount_df] DEFAULT 0,
    [billing_type] NVARCHAR(1000) NOT NULL CONSTRAINT [quote_lines_billing_type_df] DEFAULT 'ONE_TIME',
    [subscription_plan_id] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [quote_lines_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [quote_lines_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[approval_requests] (
    [id] NVARCHAR(1000) NOT NULL,
    [quote_id] NVARCHAR(1000) NOT NULL,
    [step] INT NOT NULL CONSTRAINT [approval_requests_step_df] DEFAULT 1,
    [role] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [approval_requests_status_df] DEFAULT 'PENDING',
    [reviewer_id] NVARCHAR(1000),
    [reason] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [approval_requests_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [acted_at] DATETIME2,
    CONSTRAINT [approval_requests_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[approval_actions] (
    [id] NVARCHAR(1000) NOT NULL,
    [approval_request_id] NVARCHAR(1000) NOT NULL,
    [actor_id] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [approval_actions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [approval_actions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[warehouses] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [shipping_base_cost] DECIMAL(10,2) NOT NULL CONSTRAINT [warehouses_shipping_base_cost_df] DEFAULT 0,
    [active] BIT NOT NULL CONSTRAINT [warehouses_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [warehouses_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [warehouses_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [warehouses_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[inventory] (
    [id] NVARCHAR(1000) NOT NULL,
    [warehouse_id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [quantity_available] DECIMAL(12,2) NOT NULL CONSTRAINT [inventory_quantity_available_df] DEFAULT 0,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [inventory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [inventory_warehouse_id_product_id_key] UNIQUE NONCLUSTERED ([warehouse_id],[product_id])
);

-- CreateTable
CREATE TABLE [dbo].[orders] (
    [id] NVARCHAR(1000) NOT NULL,
    [quote_id] NVARCHAR(1000) NOT NULL,
    [order_number] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [orders_status_df] DEFAULT 'PENDING',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [orders_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [orders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [orders_order_number_key] UNIQUE NONCLUSTERED ([order_number])
);

-- CreateTable
CREATE TABLE [dbo].[fulfillment_allocations] (
    [id] NVARCHAR(1000) NOT NULL,
    [order_id] NVARCHAR(1000) NOT NULL,
    [warehouse_id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [quantity] DECIMAL(12,2) NOT NULL,
    [shipping_cost] DECIMAL(10,2) NOT NULL CONSTRAINT [fulfillment_allocations_shipping_cost_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [fulfillment_allocations_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [fulfillment_allocations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[subscriptions] (
    [id] NVARCHAR(1000) NOT NULL,
    [quote_line_id] NVARCHAR(1000),
    [order_id] NVARCHAR(1000),
    [subscription_plan_id] NVARCHAR(1000) NOT NULL,
    [quantity] DECIMAL(12,2) NOT NULL CONSTRAINT [subscriptions_quantity_df] DEFAULT 1,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [subscriptions_status_df] DEFAULT 'ACTIVE',
    [started_at] DATETIME2 NOT NULL CONSTRAINT [subscriptions_started_at_df] DEFAULT CURRENT_TIMESTAMP,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [subscriptions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [subscriptions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[billing_schedules] (
    [id] NVARCHAR(1000) NOT NULL,
    [subscription_id] NVARCHAR(1000) NOT NULL,
    [billing_date] DATE NOT NULL,
    [amount] DECIMAL(14,2) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [billing_schedules_status_df] DEFAULT 'PENDING',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [billing_schedules_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [billing_schedules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[invoices] (
    [id] NVARCHAR(1000) NOT NULL,
    [order_id] NVARCHAR(1000) NOT NULL,
    [invoice_number] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL CONSTRAINT [invoices_type_df] DEFAULT 'ONE_TIME',
    [amount] DECIMAL(14,2) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [invoices_status_df] DEFAULT 'DRAFT',
    [due_date] DATE,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [invoices_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [invoices_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [invoices_invoice_number_key] UNIQUE NONCLUSTERED ([invoice_number])
);

-- CreateTable
CREATE TABLE [dbo].[payments] (
    [id] NVARCHAR(1000) NOT NULL,
    [invoice_id] NVARCHAR(1000) NOT NULL,
    [amount] DECIMAL(14,2) NOT NULL,
    [method] NVARCHAR(1000),
    [recorded_at] DATETIME2 NOT NULL CONSTRAINT [payments_recorded_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [payments_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[credit_notes] (
    [id] NVARCHAR(1000) NOT NULL,
    [invoice_id] NVARCHAR(1000) NOT NULL,
    [amount] DECIMAL(14,2) NOT NULL,
    [reason] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [credit_notes_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [credit_notes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[negotiations] (
    [id] NVARCHAR(1000) NOT NULL,
    [quote_id] NVARCHAR(1000) NOT NULL,
    [customer_id] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [negotiations_status_df] DEFAULT 'OPEN',
    [proposed_discount] DECIMAL(5,2),
    [message] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [negotiations_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [negotiations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[negotiation_messages] (
    [id] NVARCHAR(1000) NOT NULL,
    [negotiation_id] NVARCHAR(1000) NOT NULL,
    [quote_line_id] NVARCHAR(1000),
    [author_role] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [negotiation_messages_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [negotiation_messages_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[deal_health_events] (
    [id] NVARCHAR(1000) NOT NULL,
    [quote_id] NVARCHAR(1000) NOT NULL,
    [score] INT NOT NULL,
    [level] NVARCHAR(1000) NOT NULL,
    [reasons] NVARCHAR(1000) NOT NULL CONSTRAINT [deal_health_events_reasons_df] DEFAULT '[]',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [deal_health_events_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [deal_health_events_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[alerts] (
    [id] NVARCHAR(1000) NOT NULL,
    [quote_id] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL CONSTRAINT [alerts_severity_df] DEFAULT 'LOW',
    [message] NVARCHAR(1000) NOT NULL,
    [acknowledged] BIT NOT NULL CONSTRAINT [alerts_acknowledged_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [alerts_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [alerts_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_co_purchases] (
    [id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [co_product_id] NVARCHAR(1000) NOT NULL,
    [frequency] DECIMAL(5,2) NOT NULL,
    CONSTRAINT [product_co_purchases_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_co_purchases_product_id_co_product_id_key] UNIQUE NONCLUSTERED ([product_id],[co_product_id])
);

-- CreateTable
CREATE TABLE [dbo].[upsell_rules] (
    [id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [suggested_product_id] NVARCHAR(1000) NOT NULL,
    [promotion] BIT NOT NULL CONSTRAINT [upsell_rules_promotion_df] DEFAULT 0,
    [min_margin_percent] DECIMAL(5,2) NOT NULL CONSTRAINT [upsell_rules_min_margin_percent_df] DEFAULT 0,
    [active] BIT NOT NULL CONSTRAINT [upsell_rules_active_df] DEFAULT 1,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [upsell_rules_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [upsell_rules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [entity_type] NVARCHAR(1000) NOT NULL,
    [entity_id] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [actor_id] NVARCHAR(1000),
    [before_data] NVARCHAR(1000),
    [after_data] NVARCHAR(1000),
    [reason] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [audit_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [recipient_id] NVARCHAR(1000),
    [type] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [read] BIT NOT NULL CONSTRAINT [notifications_read_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [notifications_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [users_role_idx] ON [dbo].[users]([role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [customers_tier_id_idx] ON [dbo].[customers]([tier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [customers_active_idx] ON [dbo].[customers]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [products_category_id_idx] ON [dbo].[products]([category_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [products_active_idx] ON [dbo].[products]([active]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [products_type_idx] ON [dbo].[products]([type]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [discount_rules_customer_tier_id_idx] ON [dbo].[discount_rules]([customer_tier_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [discount_rules_category_id_idx] ON [dbo].[discount_rules]([category_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quotes_customer_id_idx] ON [dbo].[quotes]([customer_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quotes_status_idx] ON [dbo].[quotes]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quotes_created_at_idx] ON [dbo].[quotes]([created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quotes_sales_rep_id_idx] ON [dbo].[quotes]([sales_rep_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quotes_portal_token_idx] ON [dbo].[quotes]([portal_token]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quote_lines_quote_id_idx] ON [dbo].[quote_lines]([quote_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quote_lines_product_id_idx] ON [dbo].[quote_lines]([product_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [approval_requests_quote_id_idx] ON [dbo].[approval_requests]([quote_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [approval_requests_status_idx] ON [dbo].[approval_requests]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [approval_actions_approval_request_id_idx] ON [dbo].[approval_actions]([approval_request_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [inventory_product_id_warehouse_id_idx] ON [dbo].[inventory]([product_id], [warehouse_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [orders_quote_id_idx] ON [dbo].[orders]([quote_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [fulfillment_allocations_order_id_idx] ON [dbo].[fulfillment_allocations]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [billing_schedules_subscription_id_idx] ON [dbo].[billing_schedules]([subscription_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [invoices_order_id_idx] ON [dbo].[invoices]([order_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [negotiations_quote_id_idx] ON [dbo].[negotiations]([quote_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [negotiation_messages_negotiation_id_idx] ON [dbo].[negotiation_messages]([negotiation_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [deal_health_events_quote_id_created_at_idx] ON [dbo].[deal_health_events]([quote_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [alerts_quote_id_idx] ON [dbo].[alerts]([quote_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_entity_type_entity_id_created_at_idx] ON [dbo].[audit_logs]([entity_type], [entity_id], [created_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_recipient_id_read_idx] ON [dbo].[notifications]([recipient_id], [read]);

-- AddForeignKey
ALTER TABLE [dbo].[customers] ADD CONSTRAINT [customers_tier_id_fkey] FOREIGN KEY ([tier_id]) REFERENCES [dbo].[customer_tiers]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[customers] ADD CONSTRAINT [customers_portal_user_id_fkey] FOREIGN KEY ([portal_user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[products] ADD CONSTRAINT [products_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[product_categories]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[price_list_items] ADD CONSTRAINT [price_list_items_price_list_id_fkey] FOREIGN KEY ([price_list_id]) REFERENCES [dbo].[price_lists]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[price_list_items] ADD CONSTRAINT [price_list_items_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[discount_rules] ADD CONSTRAINT [discount_rules_customer_tier_id_fkey] FOREIGN KEY ([customer_tier_id]) REFERENCES [dbo].[customer_tiers]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[discount_rules] ADD CONSTRAINT [discount_rules_category_id_fkey] FOREIGN KEY ([category_id]) REFERENCES [dbo].[product_categories]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quotes] ADD CONSTRAINT [quotes_customer_id_fkey] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quotes] ADD CONSTRAINT [quotes_sales_rep_id_fkey] FOREIGN KEY ([sales_rep_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quote_lines] ADD CONSTRAINT [quote_lines_quote_id_fkey] FOREIGN KEY ([quote_id]) REFERENCES [dbo].[quotes]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quote_lines] ADD CONSTRAINT [quote_lines_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quote_lines] ADD CONSTRAINT [quote_lines_subscription_plan_id_fkey] FOREIGN KEY ([subscription_plan_id]) REFERENCES [dbo].[subscription_plans]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[approval_requests] ADD CONSTRAINT [approval_requests_quote_id_fkey] FOREIGN KEY ([quote_id]) REFERENCES [dbo].[quotes]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[approval_requests] ADD CONSTRAINT [approval_requests_reviewer_id_fkey] FOREIGN KEY ([reviewer_id]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[approval_actions] ADD CONSTRAINT [approval_actions_approval_request_id_fkey] FOREIGN KEY ([approval_request_id]) REFERENCES [dbo].[approval_requests]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[approval_actions] ADD CONSTRAINT [approval_actions_actor_id_fkey] FOREIGN KEY ([actor_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventory] ADD CONSTRAINT [inventory_warehouse_id_fkey] FOREIGN KEY ([warehouse_id]) REFERENCES [dbo].[warehouses]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventory] ADD CONSTRAINT [inventory_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[orders] ADD CONSTRAINT [orders_quote_id_fkey] FOREIGN KEY ([quote_id]) REFERENCES [dbo].[quotes]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[fulfillment_allocations] ADD CONSTRAINT [fulfillment_allocations_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[fulfillment_allocations] ADD CONSTRAINT [fulfillment_allocations_warehouse_id_fkey] FOREIGN KEY ([warehouse_id]) REFERENCES [dbo].[warehouses]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[fulfillment_allocations] ADD CONSTRAINT [fulfillment_allocations_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[subscriptions] ADD CONSTRAINT [subscriptions_quote_line_id_fkey] FOREIGN KEY ([quote_line_id]) REFERENCES [dbo].[quote_lines]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[subscriptions] ADD CONSTRAINT [subscriptions_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[subscriptions] ADD CONSTRAINT [subscriptions_subscription_plan_id_fkey] FOREIGN KEY ([subscription_plan_id]) REFERENCES [dbo].[subscription_plans]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[billing_schedules] ADD CONSTRAINT [billing_schedules_subscription_id_fkey] FOREIGN KEY ([subscription_id]) REFERENCES [dbo].[subscriptions]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[invoices] ADD CONSTRAINT [invoices_order_id_fkey] FOREIGN KEY ([order_id]) REFERENCES [dbo].[orders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_invoice_id_fkey] FOREIGN KEY ([invoice_id]) REFERENCES [dbo].[invoices]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[credit_notes] ADD CONSTRAINT [credit_notes_invoice_id_fkey] FOREIGN KEY ([invoice_id]) REFERENCES [dbo].[invoices]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[negotiations] ADD CONSTRAINT [negotiations_quote_id_fkey] FOREIGN KEY ([quote_id]) REFERENCES [dbo].[quotes]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[negotiations] ADD CONSTRAINT [negotiations_customer_id_fkey] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[negotiation_messages] ADD CONSTRAINT [negotiation_messages_negotiation_id_fkey] FOREIGN KEY ([negotiation_id]) REFERENCES [dbo].[negotiations]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[negotiation_messages] ADD CONSTRAINT [negotiation_messages_quote_line_id_fkey] FOREIGN KEY ([quote_line_id]) REFERENCES [dbo].[quote_lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[deal_health_events] ADD CONSTRAINT [deal_health_events_quote_id_fkey] FOREIGN KEY ([quote_id]) REFERENCES [dbo].[quotes]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[alerts] ADD CONSTRAINT [alerts_quote_id_fkey] FOREIGN KEY ([quote_id]) REFERENCES [dbo].[quotes]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_co_purchases] ADD CONSTRAINT [product_co_purchases_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_co_purchases] ADD CONSTRAINT [product_co_purchases_co_product_id_fkey] FOREIGN KEY ([co_product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[upsell_rules] ADD CONSTRAINT [upsell_rules_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[upsell_rules] ADD CONSTRAINT [upsell_rules_suggested_product_id_fkey] FOREIGN KEY ([suggested_product_id]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_actor_id_fkey] FOREIGN KEY ([actor_id]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_recipient_id_fkey] FOREIGN KEY ([recipient_id]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
