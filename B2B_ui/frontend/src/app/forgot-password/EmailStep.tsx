"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { sendOTPAsync } from '../../store/forgotPasswordSlice';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthForm } from '@/components/auth/AuthForm';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface Props {
  onSuccess: (email: string) => void;
}

type FormValues = {
  email: string;
};

const EmailStep: React.FC<Props> = ({ onSuccess }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isOTPSent } = useSelector((state: RootState) => state.forgotPassword);
  const form = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { email: '' },
  });
  const [emailValue, setEmailValue] = React.useState('');

  React.useEffect(() => {
    if (isOTPSent) {
      toast.success('OTP sent to your email');
      onSuccess(emailValue);
    }
  }, [isOTPSent, onSuccess, emailValue]);

  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const onSubmit = (data: FormValues) => {
    setEmailValue(data.email);
    dispatch(sendOTPAsync(data.email));
  };

  return (
    <AuthForm
      title="Forgot Password"
      description="Enter your email to receive a one-time password (OTP) for password reset."
      onSubmit={form.handleSubmit(onSubmit)}
      submitText={loading ? 'Sending OTP...' : 'Send OTP'}
      isLoading={loading}
      disabled={!form.formState.isValid || loading}
    >
      <Form {...form}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
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

export default EmailStep;
