import React from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import Overview from '../components/Dashboard/Overview';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <Overview />
    </DashboardLayout>
  );
};

export default Dashboard;
