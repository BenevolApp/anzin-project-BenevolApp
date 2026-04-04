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
import { Link, useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase/client';

const registerSchema = z
  .object({
    role: z.enum(['benevole', 'beneficiaire']),
    firstName: z.string().min(1, 'Prénom requis').max(100),
    lastName: z.string().min(1, 'Nom requis').max(100),
    email: z.string().email('Email invalide'),
    password: z.string().min(8, '8 caractères minimum'),
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['passwordConfirm'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

const ROLES: { value: RegisterValues['role']; label: string; sub: string }[] = [
  { value: 'benevole', label: 'Bénévole', sub: 'Je souhaite aider' },
  { value: 'beneficiaire', label: 'Bénéficiaire', sub: "J'ai besoin d'aide" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [rootError, setRootError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'benevole' },
  });

  const selectedRole = watch('role');

  async function onSubmit(values: RegisterValues) {
    setRootError(null);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          role: values.role,
          first_name: values.firstName,
          last_name: values.lastName,
        },
      },
    });

    if (error) {
      setRootError(error.message);
      return;
    }

    router.replace('/(auth)/login');
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
          <Text className="text-xl font-semibold text-zinc-900 mb-6">Créer un compte</Text>

          {/* Rôle */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 mb-2">Je suis…</Text>
            <View className="gap-2">
              {ROLES.map((r) => {
                const selected = selectedRole === r.value;
                return (
                  <TouchableOpacity
                    key={r.value}
                    className={`flex-row items-center gap-3 rounded-lg border px-4 py-3 ${
                      selected
                        ? 'border-zinc-900 bg-zinc-50'
                        : 'border-zinc-200 bg-white'
                    }`}
                    onPress={() => setValue('role', r.value)}
                  >
                    <View
                      className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                        selected ? 'border-zinc-900' : 'border-zinc-300'
                      }`}
                    >
                      {selected && (
                        <View className="w-2 h-2 rounded-full bg-zinc-900" />
                      )}
                    </View>
                    <View>
                      <Text className="text-sm font-medium text-zinc-900">{r.label}</Text>
                      <Text className="text-xs text-zinc-500">{r.sub}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.role && (
              <Text className="text-xs text-red-600 mt-1">{errors.role.message}</Text>
            )}
          </View>

          {/* Prénom + Nom */}
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="text-sm font-medium text-zinc-700 mb-1">Prénom</Text>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white"
                    autoComplete="given-name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.firstName && (
                <Text className="text-xs text-red-600 mt-1">{errors.firstName.message}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-zinc-700 mb-1">Nom</Text>
              <Controller
                control={control}
                name="lastName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    className="border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white"
                    autoComplete="family-name"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                )}
              />
              {errors.lastName && (
                <Text className="text-xs text-red-600 mt-1">{errors.lastName.message}</Text>
              )}
            </View>
          </View>

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

          {/* Confirm */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-zinc-700 mb-1">Confirmer</Text>
            <Controller
              control={control}
              name="passwordConfirm"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="border border-zinc-300 rounded-lg px-3 py-2.5 text-sm text-zinc-900 bg-white"
                  placeholder="••••••••"
                  secureTextEntry
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.passwordConfirm && (
              <Text className="text-xs text-red-600 mt-1">{errors.passwordConfirm.message}</Text>
            )}
          </View>

          {rootError && (
            <Text className="text-sm text-red-600 text-center mb-3">{rootError}</Text>
          )}

          <TouchableOpacity
            className="bg-zinc-900 rounded-lg py-3 items-center"
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-sm font-medium">Créer mon compte</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-4">
            <Text className="text-sm text-zinc-500">Déjà inscrit ? </Text>
            <Link href="/(auth)/login">
              <Text className="text-sm font-medium text-zinc-900 underline">Se connecter</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
