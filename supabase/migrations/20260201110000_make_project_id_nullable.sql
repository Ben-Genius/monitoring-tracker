-- Make project_id nullable in tasks table to support project-less tasks
alter table tasks alter column project_id drop not null;
