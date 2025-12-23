import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type UserProfile = Tables<'user_profiles'>;
type UserProfileInsert = TablesInsert<'user_profiles'>;
type UserProfileUpdate = TablesUpdate<'user_profiles'>;

export function useProfile(userId?: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadProfile = async (id?: string) => {
    const targetUserId = id || userId;
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setProfile(null);
        } else {
          throw error;
        }
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el perfil',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (data: UserProfileInsert) => {
    try {
      setSaving(true);
      const { data: newProfile, error } = await supabase
        .from('user_profiles')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      setProfile(newProfile);
      toast({
        title: 'Perfil creado',
        description: 'Tu perfil se creó exitosamente',
      });
      return newProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el perfil',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async (updates: UserProfileUpdate) => {
    if (!profile) {
      console.error('No profile to update');
      return;
    }

    try {
      setSaving(true);
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', profile.user_id)
        .select()
        .single();

      if (error) throw error;

      setProfile(updatedProfile);
      toast({
        title: 'Perfil actualizado',
        description: 'Los cambios se guardaron exitosamente',
      });
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const completeOnboarding = async () => {
    return updateProfile({
      onboarding_completed: true,
    });
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  return {
    profile,
    loading,
    saving,
    loadProfile,
    createProfile,
    updateProfile,
    completeOnboarding,
  };
}
