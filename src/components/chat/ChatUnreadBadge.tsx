type ChatUnreadBadgeProps = {
  count: number;
  className?: string;
};

/** Purple pill matching conversation-list unread indicators in ChatPanel. */
export default function ChatUnreadBadge({ count, className = '' }: ChatUnreadBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={`min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#8774e1] text-white text-xs font-medium flex items-center justify-center ${className}`}
      aria-label={`${count} unread messages`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
