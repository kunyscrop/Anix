import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  User, 
  MoreHorizontal, 
  MessageCircle, 
  Repeat2, 
  Heart, 
  BarChart2, 
  Share, 
  Image as ImageIcon, 
  Smile, 
  Calendar, 
  MapPin,
  EyeOff,
  Mic2,
  TrendingUp,
  Globe,
  Languages,
  Plus,
  Sparkles,
  X,
  ArrowRight,
  ArrowLeft,
  LogOut,
  Menu
} from 'lucide-react';
import { io } from 'socket.io-client';
import { GoogleGenAI } from '@google/genai';
import { Post, User as UserType, Anime, Message, Group, Space } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  Gamepad2, 
  Settings, 
  Users, 
  Send, 
  Video, 
  Camera, 
  Type as TypeIcon,
  ChevronRight,
  Check
} from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const socket = io();
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [view, setView] = useState<'home' | 'explore' | 'notifications' | 'messages' | 'profile' | 'anime-detail' | 'spaces' | 'groups' | 'settings' | 'games' | 'more'>('home');
  const [activeTab, setActiveTab] = useState<'for-you' | 'my-anime'>('for-you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<UserType | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  
  useEffect(() => {
    const savedUser = localStorage.getItem('anix_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    const savedTheme = localStorage.getItem('anix_theme') as 'dark' | 'light';
    if (savedTheme) setTheme(savedTheme);
    const savedLang = localStorage.getItem('anix_lang') as 'fr' | 'en';
    if (savedLang) setLanguage(savedLang);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchPosts();
      fetchAnime();

      socket.emit('join_user', currentUser.id);

      socket.on('new_post', (post: Post) => {
        setPosts(prev => [post, ...prev]);
      });

      socket.on('new_message', (msg: Message) => {
        // Handle new message notification or update chat
        console.log("New message received:", msg);
      });

      return () => {
        socket.off('new_post');
        socket.off('new_message');
      };
    }
  }, [isAuthenticated, currentUser]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('anix_theme', newTheme);
  };

  const toggleLanguage = () => {
    const newLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(newLang);
    localStorage.setItem('anix_lang', newLang);
  };

  const fetchPosts = async () => {
    const res = await fetch('/api/posts');
    const data = await res.json();
    setPosts(data);
  };

  const fetchAnime = async () => {
    const res = await fetch('/api/anime');
    const data = await res.json();
    setAnimeList(data);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, likes_count: data.action === 'liked' ? p.likes_count + 1 : p.likes_count - 1 };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleAiChat = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput;
    setAiChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    setIsAiThinking(true);
    try {
      const chat = genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are AniX AI, an expert on anime and manga. Answer the user's question about anime. User: ${userMsg}`,
      });
      const result = await chat;
      setAiChatMessages(prev => [...prev, { role: 'ai', text: result.text || "Désolé, je n'ai pas pu répondre." }]);
    } catch (error) {
      console.error("AI Chat error:", error);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follower_id: currentUser.id })
      });
    } catch (error) {
      console.error("Follow error:", error);
    }
  };

  const navigateToAnime = (anime: Anime) => {
    setSelectedAnime(anime);
    setView('anime-detail');
    window.scrollTo(0, 0);
  };

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <>
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
              <div className="px-4 py-3 flex items-center gap-4">
                <img 
                  src={currentUser.avatar_url} 
                  className="w-8 h-8 rounded-full sm:hidden cursor-pointer" 
                  alt="Avatar" 
                  onClick={() => setView('profile')}
                />
                <h1 className="text-xl font-bold flex-1">Accueil</h1>
                <TrendingUp className="w-5 h-5 text-indigo-500 sm:hidden" />
              </div>
              <div className="flex w-full">
                <TabButton 
                  label="Pour toi" 
                  active={activeTab === 'for-you'} 
                  onClick={() => setActiveTab('for-you')} 
                />
                <TabButton 
                  label="Mes animés" 
                  active={activeTab === 'my-anime'} 
                  onClick={() => setActiveTab('my-anime')} 
                />
              </div>
            </header>
            <div className="hidden sm:block">
              <PostCreator user={currentUser} onPostCreated={fetchPosts} />
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <AnimatePresence initial={false}>
                {posts.map(post => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PostItem post={post} onLike={handleLike} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        );
      case 'explore':
        return <ExploreView animeList={animeList} onAnimeClick={navigateToAnime} />;
      case 'notifications':
        return <NotificationsView />;
      case 'messages':
        return <MessagesView currentUser={currentUser} selectedUser={selectedChatUser} onSelectUser={setSelectedChatUser} />;
      case 'profile':
        return <ProfileView user={currentUser} posts={posts.filter(p => p.user_id === currentUser.id)} onLike={handleLike} onEdit={() => setIsEditProfileOpen(true)} />;
      case 'anime-detail':
        return selectedAnime ? <AnimeDetailView anime={selectedAnime} posts={posts.filter(p => p.anime_id === selectedAnime.id)} onLike={handleLike} /> : null;
      case 'spaces':
        return <SpacesView currentUser={currentUser} />;
      case 'groups':
        return <GroupsView currentUser={currentUser} />;
      case 'settings':
        return <SettingsView theme={theme} language={language} onToggleTheme={toggleTheme} onToggleLanguage={toggleLanguage} />;
      case 'games':
        return <GamesView />;
      case 'more':
        return <MoreView currentUser={currentUser} setView={setView} language={language} />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('anix_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (!isAuthenticated || !currentUser) {
    return <LoginView theme={theme} onLogin={(user) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('anix_user', JSON.stringify(user));
    }} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white font-sans flex justify-center transition-colors duration-300">
      {/* Sidebar - Desktop/Tablet */}
      <nav className="hidden sm:flex w-20 xl:w-64 h-screen sticky top-0 flex flex-col items-center xl:items-start px-4 py-2 border-r border-zinc-200 dark:border-zinc-800 transition-colors">
        <div 
          className="p-3 mb-2 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-full cursor-pointer transition-colors"
          onClick={() => setView('home')}
        >
          <div className="text-3xl font-bold text-indigo-500">AniX</div>
        </div>
        
        <SidebarItem icon={<Home />} label="Accueil" active={view === 'home'} onClick={() => setView('home')} />
        <SidebarItem icon={<Search />} label="Explorer" active={view === 'explore'} onClick={() => setView('explore')} />
        <SidebarItem icon={<Bell />} label={language === 'fr' ? "Notifications" : "Notifications"} active={view === 'notifications'} onClick={() => setView('notifications')} />
        <SidebarItem icon={<Mail />} label={language === 'fr' ? "Messages" : "Messages"} active={view === 'messages'} onClick={() => setView('messages')} />
        <SidebarItem icon={<Globe />} label={language === 'fr' ? "Groupes" : "Groups"} active={view === 'groups'} onClick={() => setView('groups')} />
        <SidebarItem icon={<Mic2 />} label={language === 'fr' ? "Espaces" : "Spaces"} active={view === 'spaces'} onClick={() => setView('spaces')} />
        <SidebarItem icon={<User />} label={language === 'fr' ? "Profil" : "Profile"} active={view === 'profile'} onClick={() => setView('profile')} />
        <SidebarItem icon={<Settings />} label={language === 'fr' ? "Paramètres" : "Settings"} active={view === 'settings'} onClick={() => setView('settings')} />
        <SidebarItem icon={<Gamepad2 />} label={language === 'fr' ? "Jeux" : "Games"} active={view === 'games'} onClick={() => setView('games')} />
        <SidebarItem icon={<MoreHorizontal />} label={language === 'fr' ? "Plus" : "More"} />

        <button 
          onClick={() => setIsComposeOpen(true)}
          className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 rounded-full transition-colors flex justify-center items-center shadow-lg shadow-indigo-500/20"
        >
          <span className="hidden xl:inline">Poster</span>
          <Plus className="xl:hidden" />
        </button>

        <div 
          className="mt-auto mb-4 p-3 w-full hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-full cursor-pointer transition-colors flex items-center gap-3"
          onClick={() => setView('profile')}
        >
          <img src={currentUser.avatar_url} className="w-10 h-10 rounded-full" alt="Avatar" />
          <div className="hidden xl:block overflow-hidden">
            <div className="font-bold truncate">{currentUser.display_name}</div>
            <div className="text-zinc-500 dark:text-zinc-400 text-sm truncate">@{currentUser.username}</div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            className="hidden xl:block ml-auto p-2 hover:bg-zinc-300 dark:hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Feed */}
      <main className="w-full sm:max-w-[600px] border-r border-zinc-200 dark:border-zinc-800 pb-20 sm:pb-0 min-h-screen transition-colors">
        {renderView()}
      </main>

      {/* Right Sidebar - Desktop only */}
      <aside className="hidden lg:flex flex-col w-80 xl:w-96 h-screen sticky top-0 px-6 py-2 gap-4">
        <div className="relative mt-1">
          <Search className="absolute left-4 top-3 text-zinc-500 w-5 h-5" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher un animé..." 
            className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full py-3 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {searchResults.map(anime => (
                <div 
                  key={anime.id} 
                  onClick={() => navigateToAnime(anime)}
                  className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-3"
                >
                  <img src={anime.image_url} className="w-10 h-10 rounded object-cover" alt="" />
                  <div className="font-bold text-zinc-900 dark:text-white">{anime.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">Tendances Animés</h2>
          {animeList.map(anime => (
            <div 
              key={anime.id} 
              className="py-3 hover:bg-zinc-200 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors flex items-center gap-3 group"
              onClick={() => navigateToAnime(anime)}
            >
              <img src={anime.image_url} className="w-12 h-12 rounded-lg object-cover" alt={anime.title} />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">Tendance dans Animés</div>
                <div className="font-bold group-hover:text-indigo-400 truncate">#{anime.title.replace(/\s+/g, '')}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{anime.members_count.toLocaleString()} membres</div>
              </div>
              <MoreHorizontal className="text-zinc-500 dark:text-zinc-400" />
            </div>
          ))}
          <button className="text-indigo-400 text-sm mt-4 hover:underline">Voir plus</button>
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">Suggestions</h2>
          <SuggestionItem name="Crunchyroll" handle="Crunchyroll" avatar="https://picsum.photos/seed/cr/100" onFollow={() => handleFollow('2')} />
          <SuggestionItem name="Weekly Shonen Jump" handle="shonenjump" avatar="https://picsum.photos/seed/sj/100" onFollow={() => handleFollow('3')} />
          <button className="text-indigo-400 text-sm mt-4 hover:underline">Voir plus</button>
        </div>
      </aside>

      {/* AI Chat Button */}
      <button 
        onClick={() => setIsAiChatOpen(true)}
        className="fixed bottom-24 right-6 lg:bottom-6 lg:right-6 bg-indigo-500 p-4 rounded-full shadow-2xl hover:bg-indigo-600 transition-all z-40 group"
      >
        <Sparkles className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
      </button>

      {/* Modals */}
      <AnimatePresence>
        {isComposeOpen && <ComposeModal user={currentUser} onClose={() => setIsComposeOpen(false)} onPostCreated={fetchPosts} />}
        {isEditProfileOpen && <EditProfileModal user={currentUser} onClose={() => setIsEditProfileOpen(false)} onUpdate={setCurrentUser} />}
        {isAiChatOpen && <AiChatModal messages={aiChatMessages} input={aiInput} onInputChange={setAiInput} onSend={handleAiChat} onClose={() => setIsAiChatOpen(false)} isThinking={isAiThinking} />}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around px-4 z-30 transition-colors">
        <button onClick={() => setView('home')} className={cn("p-2", view === 'home' ? "text-indigo-500 dark:text-white" : "text-zinc-500")}><Home className="w-7 h-7" /></button>
        <button onClick={() => setView('explore')} className={cn("p-2", view === 'explore' ? "text-indigo-500 dark:text-white" : "text-zinc-500")}><Search className="w-7 h-7" /></button>
        <button onClick={() => setView('notifications')} className={cn("p-2", view === 'notifications' ? "text-indigo-500 dark:text-white" : "text-zinc-500")}><Bell className="w-7 h-7" /></button>
        <button onClick={() => setView('messages')} className={cn("p-2", view === 'messages' ? "text-indigo-500 dark:text-white" : "text-zinc-500")}><Mail className="w-7 h-7" /></button>
        <button onClick={() => setView('more')} className={cn("p-2", view === 'more' ? "text-indigo-500 dark:text-white" : "text-zinc-500")}><Menu className="w-7 h-7" /></button>
      </div>

      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => setIsComposeOpen(true)}
        className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 z-30 active:scale-90 transition-transform"
      >
        <Plus className="w-8 h-8 text-white" />
      </button>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-4 p-3 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-full cursor-pointer transition-colors w-fit xl:w-full"
    >
      <div className={cn("w-7 h-7", active ? "text-indigo-500 dark:text-white" : "text-zinc-900 dark:text-zinc-300")}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { strokeWidth: active ? 2.5 : 2 }) : icon}
      </div>
      <span className={cn("text-xl hidden xl:inline", active ? "font-bold text-indigo-500 dark:text-white" : "font-normal text-zinc-900 dark:text-zinc-300")}>{label}</span>
    </div>
  );
}

function LoginView({ onLogin, theme }: { onLogin: (user: UserType) => void, theme: 'dark' | 'light' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-300", theme === 'dark' ? 'bg-black' : 'bg-zinc-50')}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("w-full max-w-md backdrop-blur-xl p-8 rounded-3xl border shadow-2xl transition-colors duration-300", 
          theme === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200')}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className={cn("text-3xl font-bold", theme === 'dark' ? 'text-white' : 'text-zinc-900')}>AniX</h1>
          <p className="text-zinc-500 mt-2">Connectez-vous pour rejoindre la communauté</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={cn("block text-sm font-medium mb-2", theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>Nom d'utilisateur</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn("w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                theme === 'dark' ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-900')}
              placeholder="kuny"
              required
            />
          </div>
          <div>
            <label className={cn("block text-sm font-medium mb-2", theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn("w-full rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all",
                theme === 'dark' ? 'bg-black border-zinc-800 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-900')}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              "Se connecter"
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-sm">
            Pas encore de compte ? <span className="text-indigo-400 cursor-pointer hover:underline">Inscrivez-vous</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// Views
function ExploreView({ animeList, onAnimeClick }: { animeList: Anime[], onAnimeClick: (anime: Anime) => void }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Explorer</h2>
      <div className="grid grid-cols-2 gap-4">
        {animeList.map(anime => (
          <div 
            key={anime.id} 
            className="relative rounded-2xl overflow-hidden aspect-[3/4] cursor-pointer group"
            onClick={() => onAnimeClick(anime)}
          >
            <img src={anime.image_url} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={anime.title} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="font-bold text-lg">{anime.title}</div>
              <div className="text-sm text-zinc-300">⭐ {anime.rating}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsView() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Notifications</h2>
      <div className="flex flex-col gap-6">
        <NotificationItem 
          icon={<Heart className="w-6 h-6 text-pink-500 fill-pink-500" />} 
          content="Crunchyroll a aimé votre post" 
        />
        <NotificationItem 
          icon={<User className="w-6 h-6 text-indigo-500 fill-indigo-500" />} 
          content="Weekly Shonen Jump vous suit désormais" 
        />
        <NotificationItem 
          icon={<Repeat2 className="w-6 h-6 text-emerald-500" />} 
          content="Naruto_Fan a reposté votre théorie sur Itachi" 
        />
      </div>
    </div>
  );
}

function NotificationItem({ icon, content }: { icon: React.ReactNode, content: string }) {
  return (
    <div className="flex gap-4 items-start p-4 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
      <div className="mt-1">{icon}</div>
      <div className="text-lg">{content}</div>
    </div>
  );
}

function MessagesView({ currentUser, selectedUser, onSelectUser }: { currentUser: UserType, selectedUser: UserType | null, onSelectUser: (u: UserType | null) => void }) {
  const [conversations, setConversations] = useState<UserType[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Mock conversations for now
    setConversations([
      { id: '1', username: 'goku', display_name: 'Goku', avatar_url: 'https://picsum.photos/seed/goku/100', bio: '', country_code: 'JP', is_verified: true, created_at: '' },
      { id: '2', username: 'luffy', display_name: 'Luffy', avatar_url: 'https://picsum.photos/seed/luffy/100', bio: '', country_code: 'JP', is_verified: true, created_at: '' },
      { id: '3', username: 'zoro', display_name: 'Zoro', avatar_url: 'https://picsum.photos/seed/zoro/100', bio: '', country_code: 'JP', is_verified: true, created_at: '' },
    ]);
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser]);

  const fetchMessages = async () => {
    if (!selectedUser) return;
    const res = await fetch(`/api/messages/${currentUser.id}/${selectedUser.id}`);
    const data = await res.json();
    setMessages(data);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: newMessage
      })
    });
    const data = await res.json();
    setMessages(prev => [...prev, data]);
    setNewMessage('');
  };

  if (selectedUser) {
    return (
      <div className="flex flex-col h-screen">
        <header className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <ArrowLeft className="w-5 h-5 cursor-pointer" onClick={() => onSelectUser(null)} />
          <img src={selectedUser.avatar_url} className="w-10 h-10 rounded-full" alt="" />
          <div>
            <div className="font-bold">{selectedUser.display_name}</div>
            <div className="text-zinc-500 dark:text-zinc-400 text-sm">@{selectedUser.username}</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex", msg.sender_id === currentUser.id ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[70%] p-3 rounded-2xl",
                msg.sender_id === currentUser.id ? "bg-indigo-500 text-white rounded-tr-none" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-tl-none"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black sticky bottom-0">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
            />
            <button type="submit" className="bg-indigo-500 p-2 rounded-full hover:bg-indigo-600 transition-colors text-white">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Messages</h2>
      <div className="flex flex-col">
        {conversations.map(user => (
          <div 
            key={user.id} 
            onClick={() => onSelectUser(user)}
            className="flex gap-4 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer border-b border-zinc-200 dark:border-zinc-800"
          >
            <img src={user.avatar_url} className="w-14 h-14 rounded-full" alt={user.display_name} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <div className="font-bold truncate">{user.display_name} <span className="font-normal text-zinc-500 dark:text-zinc-400">@{user.username}</span></div>
                <div className="text-zinc-500 dark:text-zinc-400 text-sm">2h</div>
              </div>
              <div className="text-zinc-500 dark:text-zinc-400 truncate">Cliquez pour discuter</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function ProfileView({ user, posts, onLike, onEdit }: { user: UserType, posts: Post[], onLike?: (id: string) => void, onEdit?: () => void }) {
  return (
    <div className="flex flex-col">
      <div className="p-4 flex items-center gap-8 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
        <ArrowLeft className="w-5 h-5 cursor-pointer" onClick={() => window.history.back()} />
        <div>
          <div className="font-bold text-xl">{user.display_name}</div>
          <div className="text-zinc-500 dark:text-zinc-400 text-sm">{posts.length} posts</div>
        </div>
      </div>

      <div className="h-48 bg-zinc-200 dark:bg-zinc-800 relative">
        <img src={user.banner_url || "https://picsum.photos/seed/banner/1000/400"} className="w-full h-full object-cover" alt="Banner" />
        <div className="absolute -bottom-16 left-4 p-1 bg-white dark:bg-black rounded-full">
          <img src={user.avatar_url} className="w-32 h-32 rounded-full border-4 border-white dark:border-black" alt="Avatar" />
        </div>
      </div>

      <div className="mt-20 px-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => {
              localStorage.removeItem('anix_user');
              window.location.reload();
            }}
            className="border border-red-500/50 text-red-500 font-bold px-4 py-2 rounded-full hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
          <button 
            onClick={onEdit}
            className="border border-zinc-200 dark:border-zinc-700 font-bold px-4 py-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            Éditer le profil
          </button>
        </div>
        <div className="mt-4">
          <div className="font-bold text-2xl">{user.display_name}</div>
          <div className="text-zinc-500">@{user.username}</div>
        </div>
        <div className="mt-4 text-[15px]">{user.bio}</div>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex gap-1"><span className="font-bold">1.2k</span><span className="text-zinc-500">Abonnements</span></div>
          <div className="flex gap-1"><span className="font-bold">45.8k</span><span className="text-zinc-500">Abonnés</span></div>
        </div>
      </div>

      <div className="flex border-b border-zinc-800">
        <TabButton label="Posts" active={true} onClick={() => {}} />
        <TabButton label="Réponses" active={false} onClick={() => {}} />
        <TabButton label="Médias" active={false} onClick={() => {}} />
        <TabButton label="J'aime" active={false} onClick={() => {}} />
      </div>

      <div className="divide-y divide-zinc-800">
        {posts.map(post => (
          <PostItem key={post.id} post={post} onLike={onLike} />
        ))}
      </div>
    </div>
  );
}

function SpacesView({ currentUser }: { currentUser: UserType }) {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async () => {
    const res = await fetch('/api/spaces');
    const data = await res.json();
    setSpaces(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/spaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, host_id: currentUser.id })
    });
    setTitle('');
    setIsCreateOpen(false);
    fetchSpaces();
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Espaces Vocaux</h2>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-indigo-500 text-white font-bold px-4 py-2 rounded-full hover:bg-indigo-600 transition-colors flex items-center gap-2"
        >
          <Mic2 className="w-5 h-5" /> Lancer
        </button>
      </div>

      {isCreateOpen && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate} 
          className="mb-8 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
        >
          <input 
            type="text" 
            placeholder="Titre de l'espace"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
            required
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-zinc-500">Annuler</button>
            <button type="submit" className="bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-4 py-2 rounded-full">Lancer</button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 gap-4">
        {spaces.map(space => (
          <SpaceCard 
            key={space.id}
            title={space.title} 
            host={space.host_name} 
            listeners={space.participant_count} 
            avatars={[space.host_avatar, "https://picsum.photos/seed/1/50", "https://picsum.photos/seed/2/50"]}
          />
        ))}
        {spaces.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            Aucun espace en direct pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}

function EditProfileModal({ user, onClose, onUpdate }: { user: UserType, onClose: () => void, onUpdate: (u: UserType) => void }) {
  const [displayName, setDisplayName] = useState(user.display_name);
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
  const [bannerUrl, setBannerUrl] = useState(user.banner_url || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, bio, avatar_url: avatarUrl, banner_url: bannerUrl })
      });
      const data = await res.json();
      onUpdate(data);
      onClose();
    } catch (error) {
      console.error("Update profile error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <X className="w-5 h-5 cursor-pointer" onClick={onClose} />
            <h2 className="text-xl font-bold">Éditer le profil</h2>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-4 py-1.5 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
        <form className="p-4 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Nom d'affichage</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Bio</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-zinc-900 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">URL de l'avatar</label>
            <input 
              type="text" 
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">URL de la bannière</label>
            <input 
              type="text" 
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              className="w-full bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
            />
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function GroupsView({ currentUser }: { currentUser: UserType }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const res = await fetch('/api/groups');
    const data = await res.json();
    setGroups(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: desc, avatar_url: `https://picsum.photos/seed/${name}/200`, created_by: currentUser.id })
    });
    setName('');
    setDesc('');
    setIsCreateOpen(false);
    fetchGroups();
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Groupes</h2>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-indigo-500 text-white font-bold px-4 py-2 rounded-full hover:bg-indigo-600 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Créer
        </button>
      </div>

      {isCreateOpen && (
        <motion.form 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleCreate} 
          className="mb-8 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4"
        >
          <input 
            type="text" 
            placeholder="Nom du groupe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
            required
          />
          <textarea 
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-zinc-500">Annuler</button>
            <button type="submit" className="bg-zinc-900 dark:bg-white text-white dark:text-black font-bold px-4 py-2 rounded-full">Créer</button>
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map(group => (
          <div key={group.id} className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 hover:border-indigo-500/50 transition-colors cursor-pointer">
            <img src={group.avatar_url} className="w-16 h-16 rounded-2xl" alt="" />
            <div>
              <div className="font-bold text-lg">{group.name}</div>
              <div className="text-zinc-500 dark:text-zinc-400 text-sm line-clamp-1">{group.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ theme, language, onToggleTheme, onToggleLanguage }: { theme: 'dark' | 'light', language: 'fr' | 'en', onToggleTheme: () => void, onToggleLanguage: () => void }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">{language === 'fr' ? 'Paramètres' : 'Settings'}</h2>
      <div className="space-y-4">
        <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            <div>
              <div className="font-bold">{language === 'fr' ? 'Mode Sombre' : 'Dark Mode'}</div>
              <div className="text-zinc-500 dark:text-zinc-400 text-sm">{theme === 'dark' ? (language === 'fr' ? 'Activé' : 'Enabled') : (language === 'fr' ? 'Désactivé' : 'Disabled')}</div>
            </div>
          </div>
          <button 
            onClick={onToggleTheme}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              theme === 'dark' ? "bg-indigo-500" : "bg-zinc-300"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
              theme === 'dark' ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        <div className="bg-zinc-100 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Languages className="w-6 h-6 text-emerald-500" />
            <div>
              <div className="font-bold">{language === 'fr' ? 'Langue' : 'Language'}</div>
              <div className="text-zinc-500 dark:text-zinc-400 text-sm">{language === 'fr' ? 'Français' : 'English'}</div>
            </div>
          </div>
          <button 
            onClick={onToggleLanguage}
            className="bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded-xl font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            {language === 'fr' ? 'English' : 'Français'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GamesView() {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Jeux AniX</h2>
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl text-center shadow-2xl">
        <Gamepad2 className="w-16 h-16 text-white mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">Clicker Challenge</h3>
        <p className="text-indigo-100 mb-6">Cliquez le plus vite possible !</p>
        
        {!isPlaying ? (
          <div className="space-y-4">
            {score > 0 && <div className="text-3xl font-bold text-white">Score Final: {score}</div>}
            <button 
              onClick={startGame}
              className="bg-white text-indigo-600 font-bold px-8 py-3 rounded-full hover:bg-indigo-50 shadow-lg transition-transform active:scale-95"
            >
              {score > 0 ? 'Rejouer' : 'Commencer'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center gap-12 text-white">
              <div>
                <div className="text-sm opacity-70">TEMPS</div>
                <div className="text-3xl font-bold">{timeLeft}s</div>
              </div>
              <div>
                <div className="text-sm opacity-70">SCORE</div>
                <div className="text-3xl font-bold">{score}</div>
              </div>
            </div>
            <button 
              onClick={() => setScore(prev => prev + 1)}
              className="w-32 h-32 bg-white rounded-full shadow-2xl flex items-center justify-center mx-auto active:scale-90 transition-transform"
            >
              <Plus className="w-12 h-12 text-indigo-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SpaceCard({ title, host, listeners, avatars }: { title: string, host: string, listeners: number, avatars: string[] }) {
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl shadow-xl cursor-pointer hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
        <Mic2 className="w-4 h-4" /> EN DIRECT
      </div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {avatars.map((a, i) => <img key={i} src={a} className="w-8 h-8 rounded-full border-2 border-indigo-600" alt="" />)}
          </div>
          <span className="text-white/90 text-sm font-medium">+{listeners} auditeurs</span>
        </div>
        <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
          <span className="text-white text-xs font-bold">Hôte: {host}</span>
        </div>
      </div>
    </div>
  );
}

function AnimeDetailView({ anime, posts, onLike }: { anime: Anime, posts: Post[], onLike?: (id: string) => void }) {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const getAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const model = genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide a quick, cool, and expert analysis of the anime "${anime.title}". Mention why it's trending, its key themes, and a recommendation for fans of other series. Keep it under 100 words.`,
      });
      const result = await model;
      setAiAnalysis(result.text || "Impossible de générer l'analyse.");
    } catch (error) {
      console.error("AI Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    getAiAnalysis();
  }, [anime.id]);

  return (
    <div className="flex flex-col">
      <div className="relative h-64">
        <img src={anime.image_url} className="w-full h-full object-cover" alt={anime.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <h2 className="text-4xl font-bold text-white">{anime.title}</h2>
          <div className="flex items-center gap-4 mt-2">
            <div className="bg-indigo-500 text-white px-3 py-1 rounded-lg font-bold">⭐ {anime.rating}</div>
            <div className="text-zinc-200 font-medium">{anime.members_count.toLocaleString()} membres</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
          <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" /> Analyse AniX AI
          </div>
          {isAnalyzing ? (
            <div className="animate-pulse flex space-y-2 flex-col">
              <div className="h-2 bg-zinc-300 dark:bg-zinc-800 rounded w-3/4"></div>
              <div className="h-2 bg-zinc-300 dark:bg-zinc-800 rounded w-full"></div>
              <div className="h-2 bg-zinc-300 dark:bg-zinc-800 rounded w-5/6"></div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 italic leading-relaxed">
              "{aiAnalysis}"
            </p>
          )}
        </div>

        <p className="text-zinc-700 dark:text-zinc-300 text-lg leading-relaxed">{anime.description}</p>
        <div className="flex gap-3 mt-6">
          <button className="flex-1 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold py-3 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">Ajouter à ma liste</button>
          <button className="flex-1 border border-zinc-200 dark:border-zinc-700 font-bold py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">Voter</button>
        </div>
      </div>

      <div className="border-t border-zinc-800">
        <div className="p-4 font-bold text-xl border-b border-zinc-800">Discussions sur {anime.title}</div>
        <div className="divide-y divide-zinc-800">
          {posts.length > 0 ? (
            posts.map(post => <PostItem key={post.id} post={post} onLike={onLike} />)
          ) : (
            <div className="p-12 text-center text-zinc-500">Aucune discussion pour le moment. Soyez le premier à en parler !</div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex-1 py-4 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors relative"
    >
      <span className={cn("font-bold transition-colors", active ? "text-zinc-900 dark:text-white" : "text-zinc-500")}>{label}</span>
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-indigo-500 rounded-full" 
        />
      )}
    </button>
  );
}

function PostCreator({ user, onPostCreated }: { user: UserType, onPostCreated: () => void }) {
  const [content, setContent] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePost = async () => {
    if (!content.trim() && !mediaUrl) return;
    setIsPosting(true);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          content,
          media_url: mediaUrl,
          is_spoiler: isSpoiler,
        })
      });
      setContent('');
      setMediaUrl('');
      setIsSpoiler(false);
      onPostCreated();
    } finally {
      setIsPosting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex gap-4">
      <img src={user.avatar_url} className="w-12 h-12 rounded-full" alt="Avatar" />
      <div className="flex-1">
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Quoi de neuf dans le monde des animés ?" 
          className="w-full bg-transparent text-xl focus:outline-none resize-none min-h-[100px] text-zinc-900 dark:text-white"
        />
        {mediaUrl && (
          <div className="relative mt-2">
            {mediaUrl.startsWith('data:video') || mediaUrl.endsWith('.mp4') ? (
              <video src={mediaUrl} controls className="rounded-2xl w-full max-h-[300px] object-cover border border-zinc-200 dark:border-zinc-800" />
            ) : (
              <img src={mediaUrl} className="rounded-2xl w-full max-h-[300px] object-cover border border-zinc-200 dark:border-zinc-800" alt="" />
            )}
            <button onClick={() => setMediaUrl('')} className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"><X className="w-4 h-4" /></button>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2 text-indigo-500">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,video/*" 
              onChange={handleFileChange} 
            />
            <button 
              className="p-2 hover:bg-indigo-500/10 rounded-full transition-colors" 
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-indigo-500/10 rounded-full transition-colors"><BarChart2 className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-indigo-500/10 rounded-full transition-colors"><Smile className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-indigo-500/10 rounded-full transition-colors"><Calendar className="w-5 h-5" /></button>
            <button 
              onClick={() => setIsSpoiler(!isSpoiler)}
              className={cn(
                "p-2 rounded-full transition-colors flex items-center gap-1 text-sm font-bold",
                isSpoiler ? "bg-red-500/20 text-red-500" : "hover:bg-indigo-500/10"
              )}
            >
              <EyeOff className="w-5 h-5" />
              {isSpoiler && "SPOILER"}
            </button>
          </div>
          <button 
            disabled={(!content.trim() && !mediaUrl) || isPosting}
            onClick={handlePost}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-full transition-colors"
          >
            Poster
          </button>
        </div>
      </div>
    </div>
  );
}

function PostItem({ post, onLike }: { post: Post, onLike?: (id: string) => void }) {
  const [showSpoiler, setShowSpoiler] = useState(!post.is_spoiler);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const translatePost = async () => {
    if (translatedContent) {
      setTranslatedContent(null);
      return;
    }
    
    setIsTranslating(true);
    try {
      const prompt = `Translate the following anime-related social media post into French. Keep anime titles, character names, and special techniques in their original or official French version if they exist. Post: "${post.content}"`;
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setTranslatedContent(result.text || null);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="p-4 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer flex gap-3 border-b border-zinc-200 dark:border-zinc-800">
      <img src={post.avatar_url} className="w-12 h-12 rounded-full flex-shrink-0" alt="Avatar" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <span className="font-bold truncate">{post.display_name}</span>
          {post.is_verified && <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-[10px]">✓</div>}
          <span className="text-zinc-500 dark:text-zinc-400 truncate">@{post.username}</span>
          <span className="text-zinc-500 dark:text-zinc-400">·</span>
          <span className="text-zinc-500 dark:text-zinc-400 text-sm whitespace-nowrap">2h</span>
          <MoreHorizontal className="ml-auto text-zinc-500 dark:text-zinc-400 w-5 h-5" />
        </div>

        <div className="relative">
          {post.is_spoiler && !showSpoiler ? (
            <div 
              onClick={(e) => { e.stopPropagation(); setShowSpoiler(true); }}
              className="bg-zinc-200 dark:bg-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              <EyeOff className="w-8 h-8 text-zinc-500" />
              <div className="font-bold text-zinc-600 dark:text-zinc-300">Contenu Spoiler</div>
              <div className="text-sm text-zinc-500 text-center">Ce post contient des spoilers. Cliquez pour voir.</div>
            </div>
          ) : (
            <>
              <p className="text-[15px] leading-normal break-words">
                {translatedContent || post.content}
              </p>
              {post.media_url && (
                <div className="mt-3">
                  {post.media_url.startsWith('data:video') || post.media_url.endsWith('.mp4') ? (
                    <video src={post.media_url} controls className="rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-h-[500px] object-cover" />
                  ) : (
                    <img src={post.media_url} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-h-[500px] object-cover" alt="Media" />
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button 
            onClick={(e) => { e.stopPropagation(); translatePost(); }}
            className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            disabled={isTranslating}
          >
            <Languages className="w-3 h-3" />
            {isTranslating ? "Traduction..." : translatedContent ? "Voir l'original" : "Traduire"}
          </button>
        </div>

        <div className="flex justify-between mt-3 text-zinc-500 max-w-md">
          <ActionButton icon={<MessageCircle className="w-5 h-5" />} count={12} hoverColor="text-indigo-500" hoverBg="hover:bg-indigo-500/10" />
          <ActionButton icon={<Repeat2 className="w-5 h-5" />} count={5} hoverColor="text-emerald-500" hoverBg="hover:bg-emerald-500/10" />
          <div onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); onLike?.(post.id); }}>
            <ActionButton 
              icon={<Heart className={cn("w-5 h-5", isLiked && "fill-pink-500 text-pink-500")} />} 
              count={post.likes_count} 
              hoverColor="text-pink-500" 
              hoverBg="hover:bg-pink-500/10" 
            />
          </div>
          <ActionButton icon={<BarChart2 className="w-5 h-5" />} count={450} hoverColor="text-indigo-500" hoverBg="hover:bg-indigo-500/10" />
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-indigo-500/10 rounded-full transition-colors hover:text-indigo-500"><Share className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, count, hoverColor, hoverBg }: { icon: React.ReactNode, count: number, hoverColor: string, hoverBg: string }) {
  return (
    <div className={cn("flex items-center gap-1 group cursor-pointer", hoverColor)}>
      <div className={cn("p-2 rounded-full transition-colors text-zinc-500 group-hover:text-inherit", hoverBg)}>
        {icon}
      </div>
      <span className="text-sm text-zinc-500 group-hover:text-inherit">{count > 0 ? count : ''}</span>
    </div>
  );
}

function MoreView({ currentUser, setView, language }: { currentUser: UserType, setView: (v: any) => void, language: 'fr' | 'en' }) {
  return (
    <div className="p-4 space-y-2">
      <header className="mb-6">
        <h2 className="text-2xl font-bold">{language === 'fr' ? 'Plus' : 'More'}</h2>
      </header>
      
      <div className="grid grid-cols-1 gap-2">
        <MenuButton icon={<Globe />} label={language === 'fr' ? "Groupes" : "Groups"} onClick={() => setView('groups')} />
        <MenuButton icon={<Mic2 />} label={language === 'fr' ? "Espaces" : "Spaces"} onClick={() => setView('spaces')} />
        <MenuButton icon={<Video />} label={language === 'fr' ? "Vidéos" : "Videos"} onClick={() => setView('explore')} />
        <MenuButton icon={<Gamepad2 />} label={language === 'fr' ? "Jeux" : "Games"} onClick={() => setView('games')} />
        <MenuButton icon={<User />} label={language === 'fr' ? "Profil" : "Profile"} onClick={() => setView('profile')} />
        <MenuButton icon={<Settings />} label={language === 'fr' ? "Paramètres" : "Settings"} onClick={() => setView('settings')} />
      </div>

      <div className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <img src={currentUser.avatar_url} className="w-12 h-12 rounded-full" alt="Avatar" />
          <div>
            <div className="font-bold">{currentUser.display_name}</div>
            <div className="text-zinc-500 dark:text-zinc-400 text-sm">@{currentUser.username}</div>
          </div>
        </div>
        <button 
          onClick={() => { localStorage.removeItem('anix_user'); window.location.reload(); }}
          className="w-full py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" /> {language === 'fr' ? 'Déconnexion' : 'Logout'}
        </button>
      </div>
    </div>
  );
}

function MenuButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-4 hover:bg-zinc-200 dark:hover:bg-zinc-900 rounded-2xl transition-colors w-full text-left"
    >
      <div className="text-indigo-500 w-6 h-6">{icon}</div>
      <span className="text-lg font-medium">{label}</span>
      <ArrowRight className="ml-auto w-5 h-5 text-zinc-300 dark:text-zinc-700" />
    </button>
  );
}

function SuggestionItem({ name, handle, avatar, onFollow }: { name: string, handle: string, avatar: string, onFollow?: () => void }) {
  const [followed, setFollowed] = useState(false);
  return (
    <div className="flex items-center gap-3 py-3 hover:bg-zinc-200 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
      <img src={avatar} className="w-10 h-10 rounded-full" alt={name} />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{name}</div>
        <div className="text-zinc-500 dark:text-zinc-400 text-sm truncate">@{handle}</div>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); setFollowed(!followed); onFollow?.(); }}
        className={cn(
          "font-bold px-4 py-1.5 rounded-full text-sm transition-colors",
          followed ? "border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:border-red-500 hover:text-red-500" : "bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
        )}
      >
        {followed ? "Abonné" : "Suivre"}
      </button>
    </div>
  );
}

function AiChatModal({ messages, input, onInputChange, onSend, onClose, isThinking }: { messages: any[], input: string, onInputChange: (v: string) => void, onSend: () => void, onClose: () => void, isThinking: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col h-[600px] shadow-2xl"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">AniX AI Assistant</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 mt-10">
              <p>Posez-moi n'importe quelle question sur les animés !</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] p-3 rounded-2xl text-sm",
                msg.role === 'user' ? "bg-indigo-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
              )}>
                {msg.text}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl text-sm flex gap-1 items-center">
                <div className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
              placeholder="Demandez à l'IA..."
              className="flex-1 bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
            />
            <button 
              onClick={onSend}
              disabled={isThinking || !input.trim()}
              className="bg-indigo-500 p-2 rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors text-white"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ComposeModal({ user, onClose, onPostCreated }: { user: UserType, onClose: () => void, onPostCreated: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm pt-20">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-white dark:bg-black w-full max-w-xl rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl"
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <X className="w-6 h-6 cursor-pointer" onClick={onClose} />
          <div className="font-bold">Nouveau Post</div>
          <div className="w-6" />
        </div>
        <PostCreator user={user} onPostCreated={() => { onPostCreated(); onClose(); }} />
      </motion.div>
    </div>
  );
}



