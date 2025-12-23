// Presence indicator component
// Shows who is currently viewing this note

interface PresenceUser {
  odId: string;
  name: string;
  email: string;
}

interface PresenceIndicatorProps {
  users: PresenceUser[];
  currentUserId: string;
}

export default function PresenceIndicator({
  users,
  currentUserId,
}: PresenceIndicatorProps) {
  // Filter out current user for display
  const otherUsers = users.filter((u) => u.odId !== currentUserId);
  const totalCount = users.length;

  return (
    <div className="presence-indicator">
      <div className="presence-avatars">
        {users.slice(0, 5).map((user, index) => (
          <div
            key={`${user.odId}-${index}`}
            className="presence-avatar"
            title={user.name}
            style={{
              backgroundColor: getColorForUser(user.email),
              zIndex: users.length - index,
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {users.length > 5 && (
          <div className="presence-avatar presence-more">
            +{users.length - 5}
          </div>
        )}
      </div>
      <span className="presence-text">
        {totalCount === 1
          ? 'Just you'
          : otherUsers.length === 1
          ? `${otherUsers[0].name} is viewing`
          : `${totalCount} people viewing`}
      </span>
    </div>
  );
}

// Generate consistent color from email
function getColorForUser(email: string): string {
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
  ];

  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
