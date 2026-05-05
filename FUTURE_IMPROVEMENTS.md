# Future Improvements

## Social / Sharing (High Complexity)
Allow users to share workout plans, meal plans, schedules, and grocery lists with other users for collaborative editing.

### What's needed:
- **User relationships** — friend requests or invite-by-username system
- **Shared resources tables** — `shared_workouts`, `shared_meal_plans`, `shared_shopping_lists`, `shared_schedules` with owner + collaborator + permission (viewer/editor)
- **Access control** — API endpoints must check both owner and collaborator access
- **Real-time sync** — either polling or WebSocket so edits from one user appear for others
- **Invite UI** — share button on each resource, enter username or email, accept/decline flow
- **Collaborator indicators** — show who else has access to a shared item

### Suggested approach:
1. Start with shopping lists (simplest — already item-based)
2. Add a `SharedResource` model with `resource_type`, `resource_id`, `owner_id`, `collaborator_id`, `permission`
3. Modify list/get queries to also return resources shared with the current user
4. Add share/unshare endpoints
5. Add WebSocket or 30-second polling for live collaboration
