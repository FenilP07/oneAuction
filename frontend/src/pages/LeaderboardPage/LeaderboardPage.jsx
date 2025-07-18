import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faGavel } from "@fortawesome/free-solid-svg-icons";
import { Table, Spinner, Alert, Button } from "react-bootstrap";
import Navbar from "../../components/Navbar.jsx";
import Footer from "../../components/Footer.jsx";
import { getAuctionLeaderboard } from "../../services/auctionService.js";

const LeaderboardPage = () => {
    const { auctionId } = useParams();
    const navigate = useNavigate();
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log("Fetching leaderboard for auctionId:", auctionId);
                const data = await getAuctionLeaderboard(auctionId);
                console.log("Leaderboard data received:", data);
                setLeaderboard(data.leaderboard || []);
            } catch (err) {
                console.error("Leaderboard fetch error:", err);
                setError(err.message || "Failed to fetch leaderboard");
            } finally {
                setLoading(false);
            }
        };

        if (auctionId) {
            fetchLeaderboard();
        } else {
            setLoading(false);
            setError("No auction ID provided");
        }
    }, [auctionId]);

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
                    <Spinner animation="border" variant="primary" size="lg" />
                    <h5 className="ms-3">Loading leaderboard...</h5>
                </div>
                <Footer />
            </>
        );
    }

    if (error) {
        return (
            <>
                <Navbar />
                <div className="container mt-5">
                    <Alert variant="danger" className="text-center">
                        <FontAwesomeIcon icon={faGavel} className="mb-3" size="3x" />
                        <h4>Error</h4>
                        <p>{error}</p>
                        <Button onClick={() => navigate("/browseAuctions")}>Back to Auctions</Button>
                    </Alert>
                </div>
                <Footer />
            </>
        );
    }

    if (!leaderboard.length) {
        return (
            <>
                <Navbar />
                <div className="container mt-5 text-center">
                    <FontAwesomeIcon icon={faTrophy} className="text-muted mb-3" size="3x" />
                    <h4>No Winners Yet</h4>
                    <p>No leaderboard data available for this auction. It may not have ended or has no bids.</p>
                    <Button onClick={() => navigate("/browseAuctions")}>Back to Auctions</Button>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="container-fluid p-5 bg-light">
                <h2 className="text-center fw-bold mb-4">
                    <FontAwesomeIcon icon={faTrophy} className="me-2" />
                    Auction Leaderboard for Auction #{auctionId}
                </h2>
                <Table striped bordered hover responsive className="shadow-sm">
                    <thead className="bg-primary text-white">
                        <tr>
                            <th>#</th>
                            <th>Product Name</th>
                            <th>Winner</th>
                            <th>Bid Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((entry, index) => (
                            <tr key={entry._id || index}>
                                <td>{index + 1}</td>
                                <td>{entry.item?.title || "Unnamed Product"}</td>
                                <td>{entry.bidder_username || "Anonymous"}</td>
                                <td>${entry.amount?.toLocaleString() || "N/A"}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
            <Footer />
        </>
    );
};

export default LeaderboardPage;