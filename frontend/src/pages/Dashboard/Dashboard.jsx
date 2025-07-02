import React from 'react';
import AuctionModal from '../../components/AuctionModal';

const DashboardPage = () => {
	const handleAuctionCreate = (data) => {
		console.log('Auction created:', data);
	};

	return (
		<main className="container mt-4">
			<h2 className="text-center mb-4">Dashboard</h2>
			<AuctionModal onAuctionCreate={handleAuctionCreate} />
		</main>
	);
};

export default DashboardPage;