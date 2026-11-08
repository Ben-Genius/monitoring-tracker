-- Let invited people actually accept their invite.
--
-- accept_invite moves an imported profile onto the new login by changing its
-- id, relying on every reference to users(id) to follow the change. Five
-- references added by the accountability-loop migrations did not, so for
-- anyone who had acknowledged or blocked a task, received a notification, or
-- added a brief item, accepting an invite failed with a foreign-key error.
-- On 2026-11-06 that blocked 7 of the 21 people without a login.
--
-- Each constraint is re-created with ON UPDATE CASCADE. ON DELETE behaviour is
-- unchanged.

alter table public.tasks
    drop constraint tasks_acknowledged_by_fkey,
    add constraint tasks_acknowledged_by_fkey foreign key (acknowledged_by)
        references public.users(id) on update cascade on delete set null;

alter table public.tasks
    drop constraint tasks_blocked_by_fkey,
    add constraint tasks_blocked_by_fkey foreign key (blocked_by)
        references public.users(id) on update cascade on delete set null;

alter table public.notifications
    drop constraint notifications_actor_id_fkey,
    add constraint notifications_actor_id_fkey foreign key (actor_id)
        references public.users(id) on update cascade on delete set null;

alter table public.notifications
    drop constraint notifications_user_id_fkey,
    add constraint notifications_user_id_fkey foreign key (user_id)
        references public.users(id) on update cascade on delete cascade;

alter table public.brief_items
    drop constraint brief_items_added_by_fkey,
    add constraint brief_items_added_by_fkey foreign key (added_by)
        references public.users(id) on update cascade on delete set null;
