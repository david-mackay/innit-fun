import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletAddress: text("wallet_address").notNull(),
    displayName: text("display_name"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    walletAddressIdx: uniqueIndex("users_wallet_address_unique").on(
      table.walletAddress
    ),
  })
);

export const authNonces = pgTable(
  "auth_nonces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletAddress: text("wallet_address").notNull(),
    nonce: text("nonce").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    walletIdx: index("auth_nonces_wallet_idx").on(table.walletAddress),
    nonceUnique: uniqueIndex("auth_nonces_nonce_unique").on(table.nonce),
  })
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "cascade",
    }), // For "Wall" posts
    referencePostId: uuid("reference_post_id"), // For "Broadcast" posts linking to an event
    content: text("content"),
    type: varchar("type", { length: 20 }).notNull().default("text"), // 'text', 'image', 'event', 'broadcast'
    mediaUrl: text("media_url"),
    vibe: varchar("vibe", { length: 50 }), // e.g., 'chill', 'energy', hex code
    eventDate: timestamp("event_date"),
    eventLocation: text("event_location"),
    expiresAt: timestamp("expires_at"),
    isFeatured: boolean("is_featured").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("posts_user_idx").on(table.userId),
    targetUserIdx: index("posts_target_user_idx").on(table.targetUserId),
    referencePostIdx: index("posts_reference_post_idx").on(
      table.referencePostId
    ),
  })
);

export const postStacks = pgTable(
  "post_stacks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaUrl: text("media_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    postIdx: index("post_stacks_post_idx").on(table.postId),
  })
);

export const eventAttendees = pgTable(
  "event_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("going"), // 'going', 'maybe'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    postIdx: index("event_attendees_post_idx").on(table.postId),
    uniqueAttendee: uniqueIndex("event_attendees_unique").on(
      table.userId,
      table.postId
    ),
  })
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 10 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    postIdx: index("reactions_post_idx").on(table.postId),
    uniqueReaction: uniqueIndex("reactions_user_post_emoji_unique").on(
      table.userId,
      table.postId,
      table.emoji
    ),
  })
);

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaUrl: text("media_url").notNull(), // GIF URL
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    postIdx: index("post_comments_post_idx").on(table.postId),
  })
);

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId1: uuid("user_id_1")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userId2: uuid("user_id_2")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'accepted'
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    user1Idx: index("friendships_user1_idx").on(table.userId1),
    user2Idx: index("friendships_user2_idx").on(table.userId2),
    uniqueFriendship: uniqueIndex("friendships_unique").on(
      table.userId1,
      table.userId2
    ),
  })
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // 'active', 'used'
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    codeIdx: uniqueIndex("invites_code_idx").on(table.code),
    creatorIdx: index("invites_creator_idx").on(table.creatorId),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content"),
    type: varchar("type", { length: 20 }).notNull().default("text"), // 'text', 'image', 'payment'
    mediaUrl: text("media_url"),
    amount: numeric("amount"), // For payments
    transactionHash: text("transaction_hash"), // For payments
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    senderIdx: index("messages_sender_idx").on(table.senderId),
    receiverIdx: index("messages_receiver_idx").on(table.receiverId),
  })
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  reactions: many(reactions),
  stacks: many(postStacks),
  comments: many(postComments),
  sentInvites: many(invites),
  friendships1: many(friendships, { relationName: "friendships1" }),
  friendships2: many(friendships, { relationName: "friendships2" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  eventAttendance: many(eventAttendees),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  targetUser: one(users, {
    fields: [posts.targetUserId],
    references: [users.id],
  }),
  referencePost: one(posts, {
    fields: [posts.referencePostId],
    references: [posts.id],
    relationName: "referencePost",
  }),
  stacks: many(postStacks),
  reactions: many(reactions),
  comments: many(postComments),
  attendees: many(eventAttendees),
}));

export const postStacksRelations = relations(postStacks, ({ one }) => ({
  post: one(posts, {
    fields: [postStacks.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postStacks.userId],
    references: [users.id],
  }),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  post: one(posts, {
    fields: [eventAttendees.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [eventAttendees.userId],
    references: [users.id],
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(posts, {
    fields: [postComments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postComments.userId],
    references: [users.id],
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user1: one(users, {
    fields: [friendships.userId1],
    references: [users.id],
    relationName: "friendships1",
  }),
  user2: one(users, {
    fields: [friendships.userId2],
    references: [users.id],
    relationName: "friendships2",
  }),
}));

export const invitesRelations = relations(invites, ({ one }) => ({
  creator: one(users, {
    fields: [invites.creatorId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostStack = typeof postStacks.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type PostComment = typeof postComments.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Invite = typeof invites.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type EventAttendee = typeof eventAttendees.$inferSelect;
