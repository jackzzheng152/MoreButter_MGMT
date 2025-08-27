"""Add Tally integration fields to pending_compensation_changes

Revision ID: 1a2b3c4d5e6f
Revises: previous_revision_id
Create Date: 2025-05-14 23:15:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic
revision = '1a2b3c4d5e6f'
down_revision = None  # replace with your previous revision id
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to the existing table
    op.add_column('pending_compensation_changes', sa.Column('submission_id', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('form_id', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('event_id', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('submitter_name', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('submitter_code', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('review_status', sa.String(), nullable=True, server_default='pending'))
    op.add_column('pending_compensation_changes', sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('reviewed_by', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('review_notes', sa.Text(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('location_id', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('location_name', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('position_id', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('position_name', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('status_id', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('status_name', sa.String(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('raw_data', sa.JSON(), nullable=True))
    op.add_column('pending_compensation_changes', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True))
    
    # Create an index on submission_id
    op.create_index(op.f('ix_pending_compensation_changes_submission_id'), 'pending_compensation_changes', ['submission_id'], unique=False)


def downgrade():
    # Remove the added columns
    op.drop_index(op.f('ix_pending_compensation_changes_submission_id'), table_name='pending_compensation_changes')
    op.drop_column('pending_compensation_changes', 'updated_at')
    op.drop_column('pending_compensation_changes', 'raw_data')
    op.drop_column('pending_compensation_changes', 'status_name')
    op.drop_column('pending_compensation_changes', 'status_id')
    op.drop_column('pending_compensation_changes', 'position_name')
    op.drop_column('pending_compensation_changes', 'position_id')
    op.drop_column('pending_compensation_changes', 'location_name')
    op.drop_column('pending_compensation_changes', 'location_id')
    op.drop_column('pending_compensation_changes', 'review_notes')
    op.drop_column('pending_compensation_changes', 'reviewed_by')
    op.drop_column('pending_compensation_changes', 'reviewed_at')
    op.drop_column('pending_compensation_changes', 'review_status')
    op.drop_column('pending_compensation_changes', 'submitter_code')
    op.drop_column('pending_compensation_changes', 'submitter_name')
    op.drop_column('pending_compensation_changes', 'event_id')
    op.drop_column('pending_compensation_changes', 'form_id')
    op.drop_column('pending_compensation_changes', 'submission_id')