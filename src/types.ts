export interface User {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  banner_url?: string;
  country_code: string;
  is_verified: boolean;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url?: string;
  is_spoiler: boolean;
  anime_id?: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_verified: boolean;
  country_code: string;
  likes_count: number;
}

export interface Anime {
  id: string;
  title: string;
  description: string;
  image_url: string;
  rating: number;
  members_count: number;
}

export interface Space {
  id: string;
  title: string;
  host_id: string;
  participant_count: number;
  is_live: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar_url: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
}
