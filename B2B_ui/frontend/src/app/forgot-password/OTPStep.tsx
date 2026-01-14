"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { resendOTPAsync } from '../../store/forgotPasswordSlice';
import OTPInput from '../../components/OTPInput';
import CountdownTimer from '../../components/CountdownTimer';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthForm } from '@/components/auth/AuthForm';
import { Button } from '@/components/ui/button';

interface Props {
  onSuccess: (otp: string) => void;
  onBack: () => void;
}

const OTP_LENGTH = 6;
const TIMER_DURATION = 900; // 15 minutes in seconds

const OTPStep: React.FC<Props> = ({ onSuccess, onBack }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.forgotPassword);
  const [otp, setOTP] = useState('');
  const [timer, setTimer] = useState(TIMER_DURATION);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer logic
  useEffect(() => {
    if (timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
      setCanResend(false);
    } else {
      setCanResend(true);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [timer]);

  // Move to password step if OTP is entered (let PasswordResetStep handle API)
  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      onSuccess(otp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  useEffect(() => {
    if (error && otp.length === OTP_LENGTH) {
      toast.error(error);
      setTimeout(() => setOTP(''), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Handle resend OTP
  const handleResend = async () => {
    if (!canResend) return;
    await dispatch(resendOTPAsync());
    setTimer(TIMER_DURATION);
    setOTP('');
    toast.success('New OTP sent');
  };

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <AuthForm
      title="Enter OTP"
      description="Enter the 6-digit OTP sent to your email."
      onSubmit={e => { e.preventDefault(); }}
      submitText="Verify OTP"
      isLoading={loading}
      disabled={otp.length !== OTP_LENGTH || loading}
      footerContent={
        <Button
          type="button"
          variant="ghost"
          className="w-full mt-2 h-11 text-base"
          onClick={onBack}
        >
          Back
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4 w-full">
        <OTPInput length={OTP_LENGTH} value={otp} onChange={setOTP} inputClassName="h-11 text-base px-3 bg-white dark:bg-input/30 border border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md shadow-xs transition-all" />
        <CountdownTimer duration={timer} onExpire={() => setCanResend(true)} />
        <Button
          type="button"
          variant="outline"
          className="w-full mt-2 h-11 text-base"
          onClick={handleResend}
          disabled={!canResend || loading}
        >
          Resend OTP
        </Button>
      </div>
    </AuthForm>
  );
};

export default OTPStep;
