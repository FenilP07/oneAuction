import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar.jsx";
import AuctionModal from "../../components/AuctionModal.jsx";
import {
  Card,
  Col,
  Row,
  Tab,
  Tabs,
  Table,
  Badge,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import {
  FiPackage,
  FiDollarSign,
  FiAward,
  FiShoppingBag,
  FiClock,
  FiUser,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import useAuthStore from "../../store/authStore";
import { getMyAuctions, getMyBids } from "../../services/auctionService";
import { getMyItems } from "../../services/itemService";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, getUserRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState("auctioneer");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ items: null, auctions: null, bids: null });
  const [stats, setStats] = useState({
    itemsListed: 0,
    auctionsCreated: 0,
    activeAuctions: 0,
    pendingApprovals: 0,
    bidsPlaced: 0,
    itemsWon: 0,
    watchlist: 0,
  });
  const [myItems, setMyItems] = useState([]);
  const [myAuctions, setMyAuctions] = useState([]);
  const [biddingActivity, setBiddingActivity] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);

  // Retry function for failed requests
  const retryRequest = async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.warn(`Retry ${i + 1}/${maxRetries} failed:`, error.message);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

 useEffect(() => {
    const checkAndFetch = async () => {
      const isLoggedIn = isAuthenticated?.();
      const role = getUserRole?.();
      console.log("Effect triggered | Tab:", activeTab, "| Role:", role, "| Auth:", isLoggedIn);

      if (isLoggedIn && user) {
        await fetchDashboardData(role);
      } else {
        console.log("User not authenticated or missing.");
      }
    };
    checkAndFetch();
  }, [user, activeTab]);

  // const fetchDashboardData = async () => {
  //   setLoading(true);
  //   setErrors({ items: null, auctions: null, bids: null });

  //   try {
  //     if (activeTab === "auctioneer" && ["admin", "auctioneer"].includes(getUserRole())) {
  //       const [itemsRes, auctionsRes] = await Promise.all([
  //         retryRequest(() => getMyItems()).catch((err) => {
  //           console.error('getMyItems failed:', err.message);
  //           setErrors((prev) => ({ ...prev, items: err.message || 'Failed to fetch items' }));
  //           return { items: [], totalItems: 0, currentPage: 1, totalPages: 1 };
  //         }),
  //         retryRequest(() => getMyAuctions()).catch((err) => {
  //           console.error('getMyAuctions failed:', err.message);
  //           setErrors((prev) => ({ ...prev, auctions: err.message || 'Failed to fetch auctions' }));
  //           return { auctions: [] };
  //         }),
  //       ]);

  //       const items = itemsRes.items || [];
  //       const auctions = auctionsRes || [];

  //       console.log('Fetched items:', items);
  //       console.log('Fetched auctions:', auctions);

  //       setMyItems(items);
  //       setMyAuctions(auctions);

  //       const pendingItems = items.filter((item) => item.status === "pending_approval").length;
  //       const activeAuctions = auctions.filter((auction) => auction.auction_status === "active").length;

  //       setStats((prev) => ({
  //         ...prev,
  //         itemsListed: items.length,
  //         auctionsCreated: auctions.length,
  //         activeAuctions,
  //         pendingApprovals: pendingItems,
  //       }));

  //       generatePerformanceData(items, auctions);
  //     } else if (activeTab === "bidder") {
  //       const bidsRes = await retryRequest(() => getMyBids()).catch((err) => {
  //         console.error('getMyBids failed:', err.message);
  //         setErrors((prev) => ({ ...prev, bids: err.message || 'Failed to fetch bids' }));
  //         return { bids: [] };
  //       });
  //       const bids = bidsRes.bids || [];
  //       console.log('Fetched bids:', bids);
  //       setBiddingActivity(bids);

  //       setStats((prev) => ({
  //         ...prev,
  //         bidsPlaced: bids.length,
  //         itemsWon: bids.filter((bid) => bid.status === "won").length,
  //       }));
  //     }
  //   } catch (error) {
  //     console.error("Fetch dashboard data error:", error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
 const fetchDashboardData = async (role) => {
    setLoading(true);
    setErrors({ items: null, auctions: null, bids: null });
    setStats({
      itemsListed: 0, auctionsCreated: 0, activeAuctions: 0, pendingApprovals: 0,
      bidsPlaced: 0, itemsWon: 0, watchlist: 0, totalSpent: 0,
    });

    try {
      if (activeTab === "auctioneer" && ["admin", "user"].includes(role)) {
        console.log("Fetching data for auctioneer...");
        const [itemsRes, auctionsRes] = await Promise.all([
          retryRequest(() => getMyItems()).catch((err) => {
            console.error("getMyItems failed:", err.message);
            setErrors((prev) => ({ ...prev, items: err.message || "Failed to fetch items" }));
            return { items: [] };
          }),
          retryRequest(() => getMyAuctions()).catch((err) => {
            console.error("getMyAuctions failed:", err.message);
            setErrors((prev) => ({ ...prev, auctions: err.message || "Failed to fetch auctions" }));
            return [];
          }),
        ]);

        const items = itemsRes.items || [];
        const auctions = auctionsRes || [];

        console.log("Fetched items:", items.length);
        console.log("Fetched auctions:", auctions.length);

        setMyItems(items);
        setMyAuctions(auctions);

        const pendingItems = items.filter((item) => item.status === "pending_approval").length;
        const activeAuctions = auctions.filter((auction) => auction.auction_status === "active").length;

        setStats((prev) => ({
          ...prev,
          itemsListed: items.length,
          auctionsCreated: auctions.length,
          activeAuctions,
          pendingApprovals: pendingItems,
        }));

        generatePerformanceData(items, auctions);
      } else if (activeTab === "bidder") {
        console.log("Fetching data for bidder...");

        const bidsRes = await retryRequest(() => getMyBids()).catch((err) => {
          console.error("getMyBids failed:", err.message);
          setErrors((prev) => ({ ...prev, bids: err.message || "Failed to fetch bids" }));
          return { bids: [] };
        });

        const bids = bidsRes.bids || [];

        console.log("Fetched bids:", bids.length);

        const totalSpent = bids
          .filter((bid) => bid.status === "won")
          .reduce((sum, bid) => sum + (bid.amount || 0), 0);

        setBiddingActivity(bids);
        setStats((prev) => ({
          ...prev,
          bidsPlaced: bids.length,
          itemsWon: bids.filter((bid) => bid.status === "won").length,
          totalSpent,
        }));
      }
    } catch (error) {
      console.error("Fetch dashboard data error:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePerformanceData = (items, auctions) => {
    const monthlyData = items.reduce((acc, item) => {
      if (item.status === "available" || item.status === "sold") {
        const month = new Date(item.createdAt).getMonth();
        const monthName = new Date(0, month).toLocaleString("default", { month: "short" });

        if (!acc[monthName]) {
          acc[monthName] = { items: 0, revenue: 0 };
        }

        acc[monthName].items += 1;
        if (item.status === "sold") {
          acc[monthName].revenue += item.current_bid || 0;
        }
        return acc;
      }
      return acc;
    }, {});

    const performance = Object.entries(monthlyData).map(([name, data]) => ({
      name,
      items: data.items,
      revenue: data.revenue,
    }));

    setPerformanceData(performance);
  };

  const handleAuctionCreate = async (auctionData) => {
    try {
      setErrors((prev) => ({ ...prev, auctions: null }));
      console.log("Auction created:", auctionData);
      setMyAuctions((prev) => [...prev, auctionData.auction || auctionData]);
      await fetchDashboardData();
    } catch (error) {
      setErrors((prev) => ({ ...prev, auctions: error.message || "Failed to create auction" }));
      console.error("Create auction error:", error);
    }
  };

  const renderAuctioneerDashboard = () => (
    <>
      {errors.items && (
        <Alert variant="danger" onClose={() => setErrors((prev) => ({ ...prev, items: null }))} dismissible>
          {errors.items}
        </Alert>
      )}
      {errors.auctions && (
        <Alert variant="danger" onClose={() => setErrors((prev) => ({ ...prev, auctions: null }))} dismissible>
          {errors.auctions}
        </Alert>
      )}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <FiPackage size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Items Listed</h6>
                  <h4 className="mb-0">{stats.itemsListed}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                  <FiShoppingBag size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Auctions Created</h6>
                  <h4 className="mb-0">{stats.auctionsCreated}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                  <FiClock size={24} className="text-warning" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Active Auctions</h6>
                  <h4 className="mb-0">{stats.activeAuctions}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 p-3 rounded me-3">
                  <FiDollarSign size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Pending Approvals</h6>
                  <h4 className="mb-0">{stats.pendingApprovals}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={8} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <Card.Title>Sales Performance</Card.Title>
                <Button variant="outline-primary" size="sm">
                  View Report
                </Button>
              </div>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : performanceData.length === 0 ? (
                <Alert variant="info">No sales data available.</Alert>
              ) : (
                <div style={{ height: "300px" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="revenue" fill="#4e73df" name="Revenue ($)" />
                      <Bar dataKey="items" fill="#1cc88a" name="Items Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="mb-3">Recent Items</Card.Title>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" />
                </div>
              ) : myItems.length === 0 ? (
                <Alert variant="info">No items found. Add items to get started.</Alert>
              ) : (
                <>
                  <Table hover responsive>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Status</th>
                        <th>Bids</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myItems.slice(0, 5).map((item) => (
                        <tr
                          key={item._id}
                          onClick={() => navigate(`/items/${item._id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>{item.name || "Unnamed Item"}</td>
                          <td>
                            <Badge bg={getStatusBadgeColor(item.status)}>
                              {item.status || "Unknown"}
                            </Badge>
                          </td>
                          <td>{item.bids?.length || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <Button
                    variant="outline-primary"
                    className="w-100 mt-2"
                    onClick={() => navigate("/items")}
                  >
                    View All Items
                  </Button>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title>Auction Management</Card.Title>
            <AuctionModal onAuctionCreate={handleAuctionCreate} />
          </div>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : myAuctions.length === 0 ? (
            <Alert variant="info">No auctions found. Create an auction to get started.</Alert>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Auction</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myAuctions.slice(0, 5).map((auction) => (
                  <tr key={auction._id}>
                    <td>{auction.auction_title || "Untitled Auction"}</td>
                    <td>
                      <Badge bg={getAuctionStatusBadge(auction.auction_status)}>
                        {auction.auction_status || "Unknown"}
                      </Badge>
                    </td>
                    <td>{auction.settings?.item_ids?.length || auction.settings?.item_id ? 1 : 0}</td>
                    <td>
                      {new Date(auction.auction_end_time).toLocaleDateString()}
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => navigate(`/auctions/${auction._id}`)}
                      >
                        View
                      </Button>
                      {auction.auction_status === "upcoming" && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => navigate(`/auctions/${auction._id}/edit`)}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );

  const renderBidderDashboard = () => (
    <>
      {errors.bids && (
        <Alert variant="danger" onClose={() => setErrors((prev) => ({ ...prev, bids: null }))} dismissible>
          {errors.bids}
        </Alert>
      )}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <FiShoppingBag size={24} className="text-primary" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Bids Placed</h6>
                  <h4 className="mb-0">{stats.bidsPlaced}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                  <FiAward size={24} className="text-success" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Items Won</h6>
                  <h4 className="mb-0">{stats.itemsWon}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                  <FiClock size={24} className="text-warning" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Watchlist</h6>
                  <h4 className="mb-0">{stats.watchlist}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3} sm={6} className="mb-3">
          <Card>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 p-3 rounded me-3">
                  <FiDollarSign size={24} className="text-info" />
                </div>
                <div>
                  <h6 className="text-muted mb-1">Total Spent</h6>
                  <h4 className="mb-0">${stats.totalSpent || 0}</h4>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title className="mb-3">Your Bidding Activity</Card.Title>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : biddingActivity.length === 0 ? (
            <Alert variant="info">No bidding activity found.</Alert>
          ) : (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Your Bid</th>
                  <th>Status</th>
                  <th>Time Left</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {biddingActivity.slice(0, 5).map((bid) => (
                  <tr key={bid._id}>
                    <td>{bid.item?.name || "Unknown Item"}</td>
                    <td>${bid.amount || 0}</td>
                    <td>
                      <Badge bg={getBidStatusBadge(bid.status)}>
                        {bid.status || "Unknown"}
                      </Badge>
                    </td>
                    <td>{bid.timeLeft || "N/A"}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => navigate(`/items/${bid.item?._id}`)}
                      >
                        View
                      </Button>
                      {bid.status === "outbid" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate(`/items/${bid.item?._id}/bid`)}
                        >
                          Rebid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Row>
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="mb-3">Your Watchlist</Card.Title>
              <div className="text-center py-5">
                <p>Your watched items will appear here</p>
                <Button variant="outline-primary" onClick={() => navigate("/watchlist")}>
                  View Watchlist
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} className="mb-4">
          <Card className="h-100">
            <Card.Body>
              <Card.Title className="mb-3">Recommended For You</Card.Title>
              <div className="text-center py-5">
                <p>Recommended items will appear here</p>
                <Button variant="outline-primary" onClick={() => navigate("/auctions")}>
                  Browse Auctions
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "available":
        return "success";
      case "pending_approval":
        return "warning";
      case "sold":
        return "primary";
      case "rejected":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getAuctionStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "upcoming":
        return "warning";
      case "completed":
        return "primary";
      case "cancelled":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getBidStatusBadge = (status) => {
    switch (status) {
      case "leading":
        return "success";
      case "outbid":
        return "danger";
      case "won":
        return "primary";
      case "lost":
        return "secondary";
      default:
        return "warning";
    }
  };

  if (!isAuthenticated() || !user) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8 text-center p-4">
            <h3 className="mb-2">Authentication Required</h3>
            <p className="text-muted">Please log in to access your dashboard</p>
            <Button variant="primary" onClick={() => navigate("/login")}>
              Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container-fluid py-4 bgSecond">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-1 textSecond fw-bold">Welcome back, {user.username || "User"}</h2>
            <p className="text-muted mb-0">
              {activeTab === "auctioneer"
                ? "Manage your auctions and items"
                : "Track your bids and discover new items"}
            </p>
          </div>
          <Button
            variant={activeTab === "auctioneer" ? "primary" : "outline-primary"}
            onClick={() =>
              navigate(activeTab === "auctioneer" ? "/itemListingPage" : "/auctions")
            }
          >
            {activeTab === "auctioneer" ? "Add New Item" : "Browse Auctions"}
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-4"
        >
          <Tab
            eventKey="auctioneer"
            title={<span><FiUser className="me-1" /> Auctioneer</span>}
            disabled={!["admin", "auctioneer"].includes(getUserRole())}
          >
            {renderAuctioneerDashboard()}
          </Tab>
          <Tab
            eventKey="bidder"
            title={<span><FiShoppingBag className="me-1" /> Bidder</span>}
          >
            {renderBidderDashboard()}
          </Tab>
        </Tabs>
      </main>
    </>
  );
};

export default Dashboard;