import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Menu, X, Pencil, Check, Calendar, BookOpen, User, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import './ConversationSidebar.css';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface ConversationSidebarProps {
  userId: string;
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  userId,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [profileExpanded, setProfileExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data);
  };

  useEffect(() => {
    loadConversations();
  }, [userId]);

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    loadConversations();
    if (currentConversationId === id) {
      onNewConversation();
    }
  };

  const startEditing = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveTitle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!editingTitle.trim()) {
      cancelEditing();
      return;
    }

    const { error } = await supabase
      .from('conversations')
      .update({ title: editingTitle.trim() })
      .eq('id', id);

    if (error) {
      console.error('Error updating conversation title:', error);
      return;
    }

    loadConversations();
    cancelEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveTitle(id);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión');
    } else {
      navigate('/');
      toast.success('Sesión cerrada');
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const navItems = [
    { path: '/planner', label: 'Planificador', icon: Calendar },
    { path: '/diet-guide', label: 'Guía de Dietas', icon: BookOpen },
  ];

  const profileSubItems = [
    { path: '/profile/personal', label: 'Información Personal' },
    { path: '/profile/diet', label: 'Dieta' },
    { path: '/profile/nutrition', label: 'Objetivos' },
    { path: '/profile/preferences', label: 'Preferencias' },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button onClick={onNewConversation} className="flex-1 gap-2">
            <Plus className="h-4 w-4" />
            Nueva conversación
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="md:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => {
                if (editingId !== conv.id) {
                  onSelectConversation(conv.id);
                  setIsOpen(false);
                }
              }}
              className={cn('conversation-item', currentConversationId === conv.id && 'active')}
            >
              <MessageSquare className="conversation-item-icon" />
              <div className="conversation-item-text-wrapper">
                {editingId === conv.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, conv.id)}
                    onBlur={() => saveTitle(conv.id)}
                    className="conversation-item-input"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="conversation-item-text">{conv.title}</span>
                )}
              </div>
              <div className="conversation-item-actions">
                {editingId === conv.id ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'conversation-item-action-btn',
                      currentConversationId === conv.id && 'hover:bg-primary-foreground/20'
                    )}
                    onClick={(e) => saveTitle(conv.id, e)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'conversation-item-action-btn',
                      currentConversationId === conv.id && 'hover:bg-primary-foreground/20'
                    )}
                    onClick={(e) => startEditing(conv.id, conv.title, e)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'conversation-item-action-btn',
                    currentConversationId === conv.id && 'hover:bg-primary-foreground/20'
                  )}
                  onClick={(e) => deleteConversation(conv.id, e)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Navigation Footer */}
      <div className="border-t border-border">
        <div className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start gap-3"
                onClick={() => handleNavigate(item.path)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}

          {/* Profile with submenu */}
          <div>
            <Button
              variant={location.pathname.startsWith('/profile') ? 'default' : 'ghost'}
              className="w-full justify-start gap-3"
              onClick={() => setProfileExpanded(!profileExpanded)}
            >
              <User className="h-4 w-4" />
              Mi Perfil
              {profileExpanded ? (
                <ChevronDown className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </Button>
            {profileExpanded && (
              <div className="ml-7 mt-1 space-y-1">
                {profileSubItems.map((subItem) => {
                  const isActive = location.pathname === subItem.path;
                  return (
                    <Button
                      key={subItem.path}
                      variant={isActive ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-sm"
                      onClick={() => handleNavigate(subItem.path)}
                    >
                      {subItem.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transform transition-transform md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block w-72 bg-card border-r border-border h-full">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

export { type Conversation };
