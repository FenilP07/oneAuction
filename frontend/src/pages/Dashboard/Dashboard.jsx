
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar.jsx';
import '../Login/login.css';
import { getUserById } from '../../services/userService.js';
import AuctionModal from '../../components/AuctionModal';

const Dashboard = () => {
	const navigate = useNavigate();
	const [userData, setUserData] = useState(null);
	const [firstName, setFirstName] = useState('');

	const userId = localStorage.getItem('userId');
	console.log('User ID from localStorage:', userId);

	useEffect(() => {
		const userId = localStorage.getItem('userId');
		if (userId) {
			getUserById(userId)
				.then((user) => {
					setFirstName(user.profile.firstName);
				})
				.catch((err) => {
					console.error('Error fetching user:', err.message);
				});
		}
	}, []);

	const handleAuctionCreate = (data) => {
		console.log('Auction created:', data);
	};

	return (
		<>
			<Navbar />
			<main className="container-fluid">
				<h2 className="text-center mb-4">Dashboard</h2>
				<section className="register-page">
					<div className="form-wrapper text-center">
						<h1>Welcome, {firstName ? firstName : 'Sir'}</h1>
					</div>
				</section>
				<AuctionModal onAuctionCreate={handleAuctionCreate} />
			</main>
		</>
	);
};

export default Dashboard;