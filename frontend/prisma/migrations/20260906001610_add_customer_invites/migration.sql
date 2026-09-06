BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[customer_invites] (
    [id] NVARCHAR(1000) NOT NULL,
    [customer_id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [token] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [customer_invites_status_df] DEFAULT 'PENDING',
    [invited_by_id] NVARCHAR(1000) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [accepted_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [customer_invites_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [customer_invites_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [customer_invites_token_key] UNIQUE NONCLUSTERED ([token])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [customer_invites_customer_id_idx] ON [dbo].[customer_invites]([customer_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [customer_invites_token_idx] ON [dbo].[customer_invites]([token]);

-- AddForeignKey
ALTER TABLE [dbo].[customer_invites] ADD CONSTRAINT [customer_invites_customer_id_fkey] FOREIGN KEY ([customer_id]) REFERENCES [dbo].[customers]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[customer_invites] ADD CONSTRAINT [customer_invites_invited_by_id_fkey] FOREIGN KEY ([invited_by_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
