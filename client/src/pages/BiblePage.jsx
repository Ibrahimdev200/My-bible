import React from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import BibleBrowser from '../components/Bible/BibleBrowser';

const BiblePage = () => {
  return (
    <DashboardLayout>
      <BibleBrowser />
    </DashboardLayout>
  );
};

export default BiblePage;
