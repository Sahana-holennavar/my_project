"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { resetPasswordAsync } from '../../store/forgotPasswordSlice';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/auth/AuthForm';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface Props {
  email: string;
  otp: string;
  onSuccess: () => void;
}

type FormValues = {
  password: string;
  confirmPassword: string;
};

const PasswordResetStep: React.FC<Props> = ({ email, otp, onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isPasswordReset } = useSelector((state: RootState) => state.forgotPassword);
  const form = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });
  const router = useRouter();

  useEffect(() => {
    if (isPasswordReset) {
      toast.success('Password reset successful! Please login.');
      setTimeout(() => {
        onSuccess();
        router.push('/login');
      }, 2000);
    }
  }, [isPasswordReset, onSuccess, router]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const onSubmit = (data: FormValues) => {
    dispatch(resetPasswordAsync({ email, otp, newPassword: data.password }));
    form.reset();
  };

  return (
    <AuthForm
      title="Reset Password"
      description="Enter your new password below."
      onSubmit={form.handleSubmit(onSubmit)}
      submitText={loading ? 'Resetting...' : 'Reset Password'}
      isLoading={loading}
      disabled={!form.formState.isValid || loading}
    >
      <Form {...form}>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  disabled={loading}
                  className="h-11 text-base px-3 bg-white dark:bg-input/30 border border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md shadow-xs transition-all"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  disabled={loading}
                  className="h-11 text-base px-3 bg-white dark:bg-input/30 border border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md shadow-xs transition-all"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </Form>
    </AuthForm>
  );
};

export default PasswordResetStep;
