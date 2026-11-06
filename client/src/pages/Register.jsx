import React from 'react';
import RegisterForm from '../components/Auth/RegisterForm';

const Register = () => {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-gold-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="relative z-10 w-full flex justify-center py-8">
        <RegisterForm />
      </div>
    </div>
  );
};

export default Register;
