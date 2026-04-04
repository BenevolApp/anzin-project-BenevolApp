import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setRootError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) setRootError('Email ou mot de passe incorrect.');
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-zinc-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerClassName="flex-grow items-center justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-2xl font-bold text-zinc-900 mb-1">BénévolApp</Text>
        <Text className="text-sm text-zinc-500 mb-8">Plateforme de bénévolat encadré</Text>

        <View className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
          <Text className="text-xl font-semibold text-zinc-900 mb-6">Connexion</Text>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 mb-1">Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white"
                  placeholder="vous@exemple.fr"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.email && (
              <Text className="text-xs text-red-600 mt-1">{errors.email.message}</Text>
            )}
          </View>

          {/* Password */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 mb-1">Mot de passe</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white"
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.password && (
              <Text className="text-xs text-red-600 mt-1">{errors.password.message}</Text>
            )}
          </View>

          {rootError && (
            <Text className="text-sm text-red-600 text-center mb-3">{rootError}</Text>
          )}

          <TouchableOpacity
            className="bg-zinc-900 rounded-lg py-3 items-center disabled:opacity-50"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-sm font-medium">Se connecter</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-sm text-zinc-500">Pas encore de compte ? </Text>
            <Link href="/(auth)/register">
              <Text className="text-sm font-medium text-zinc-900 underline">S&apos;inscrire</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
