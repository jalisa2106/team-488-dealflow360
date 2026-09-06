BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[product_variants] (
    [id] NVARCHAR(1000) NOT NULL,
    [product_id] NVARCHAR(1000) NOT NULL,
    [attribute_name] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(1000) NOT NULL,
    [extra_price] DECIMAL(14,2) NOT NULL CONSTRAINT [product_variants_extra_price_df] DEFAULT 0,
    [sku] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [product_variants_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_variants_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_variants_sku_key] UNIQUE NONCLUSTERED ([sku])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_variants_product_id_idx] ON [dbo].[product_variants]([product_id]);

-- AddForeignKey
ALTER TABLE [dbo].[product_variants] ADD CONSTRAINT [product_variants_product_id_fkey] FOREIGN KEY ([product_id]) REFERENCES [dbo].[products]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
