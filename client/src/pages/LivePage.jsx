import React from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import LiveDetection from '../components/Live/LiveDetection';

const LivePage = () => {
  return (
    <DashboardLayout>
      <LiveDetection />
    </DashboardLayout>
  );
};

export default LivePage;
