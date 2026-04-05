-- Convert kanban_columns.order_index to float
ALTER TABLE kanban_columns 
ALTER COLUMN order_index TYPE double precision;

-- Convert kanban_cards.position to float
ALTER TABLE kanban_cards 
ALTER COLUMN position TYPE double precision;
