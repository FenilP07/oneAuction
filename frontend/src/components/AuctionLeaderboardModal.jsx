import React, { useState } from "react";
import { Modal, Button, Spinner, Alert, Form } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faTimes } from "@fortawesome/free-solid-svg-icons";

const AuctionLeaderboardModal = ({
  showLeaderboard,
  setShowLeaderboard,
  leaderboardData,
  previewLoading,
  previewError,
  auctionTitle,
  formatStatus,
  getStatusBadgeClass,
}) => {
  const [showAll, setShowAll] = useState(false);

  console.log("Leaderboard data:", JSON.stringify(leaderboardData, null, 2));

  let sortedLeaderboard = [];
  let isMultiItem = false;

  if (leaderboardData?.leaderboard) {
    const firstEntry = leaderboardData.leaderboard[0];

    if (firstEntry && firstEntry.bidder_id) {
      sortedLeaderboard = [...leaderboardData.leaderboard]
        .sort((a, b) => (b.bid_amount || 0) - (a.bid_amount || 0));
      isMultiItem = false;
    } else if (firstEntry && firstEntry.item_id) {
      isMultiItem = true;
      sortedLeaderboard = [...leaderboardData.leaderboard]
        .filter(item => item.winner && item.winner !== "No winner")
        .sort((a, b) => (b.final_bid || 0) - (a.final_bid || 0))
        .map((item, index) => ({
          bidder_id: item.winner_id,
          username: item.winner,
          bid_amount: item.final_bid,
          bid_time: leaderboardData.auction_end_time,
          is_winner: true,
          item_name: item.item_name,
          rank: index + 1
        }));
    }
  }

  const displayLeaderboard = showAll ? sortedLeaderboard : sortedLeaderboard.slice(0, 3);

  const getCrownEmoji = (rank) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return "";
    }
  };

  return (
    <Modal
      show={showLeaderboard}
      onHide={() => setShowLeaderboard(false)}
      size="lg"
      centered
      className="leaderboard-modal"
    >
      <Modal.Header className="bg-gray-100 border-b-0">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
            <Modal.Title className="font-bold">
              {leaderboardData?.auction_title || auctionTitle || "Auction Leaderboard"}
            </Modal.Title>
          </div>
          {/* <Button
            variant="link"
            onClick={() => setShowLeaderboard(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <FontAwesomeIcon icon={faTimes} />
          </Button> */}
        </div>
      </Modal.Header>

      <Modal.Body className="p-4">
        {previewLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner animation="border" variant="primary" />
            <span className="ml-3 text-gray-600">Loading leaderboard...</span>
          </div>
        ) : previewError ? (
          <Alert variant="danger" className="text-center">
            <h5>Error Loading Leaderboard</h5>
            <p>{previewError}</p>
          </Alert>
        ) : sortedLeaderboard.length > 0 ? (
          <div>
            <div className="mb-3">
              <span
                className={`badge ${getStatusBadgeClass(
                  leaderboardData.auction_status || leaderboardData.status
                )} mr-2`}
              >
                {formatStatus(leaderboardData.auction_status || leaderboardData.status)}
              </span>
              {!isMultiItem ? (
                <>
                  {/* <span className="text-muted mr-2">
                    Item: {leaderboardData.item_name || "N/A"}
                  </span> */}
                  {/* <span className="text-muted mr-2">
                    Total Bids: {leaderboardData.total_bids || 0}
                  </span> */}
                  {/* <span className="text-muted">
                    Unique Bidders: {leaderboardData.unique_bidders || 0}
                  </span> */}
                </>
              ) : (
                <>
                  {/* <span className="text-muted mr-2">
                    Total Items: {leaderboardData.total_items || 0}
                  </span> */}
                  <span className="text-muted">
                    Winners Shown: {sortedLeaderboard.length}
                  </span>
                </>
              )}
            </div>

            <div className="mb-3">
              {isMultiItem
                ? leaderboardData.auction_description || "No description available"
                : leaderboardData.item_description || "No description available"}
            </div>

            <Form.Check
              type="switch"
              id="toggle-leaderboard"
              label={`Show ${showAll ? "Top 3 Only" : "Full Leaderboard"}`}
              checked={showAll}
              onChange={() => setShowAll(!showAll)}
              className="mb-3"
            />

            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">
                      {isMultiItem ? "Winner" : "Bidder"}
                    </th>
                    {isMultiItem && <th className="px-4 py-2 text-left">Item Won</th>}
                    <th className="px-4 py-2 text-left">
                      {isMultiItem ? "Winning Bid" : "Bid Amount"}
                    </th>
                    <th className="px-4 py-2 text-left">Bid Time</th>
                    {!isMultiItem && <th className="px-4 py-2 text-left">Winner</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayLeaderboard.map((entry, index) => {
                    const highlight =
                      entry.rank === 1
                        ? "bg-yellow-100"
                        : entry.rank === 2
                        ? "bg-gray-100"
                        : entry.rank === 3
                        ? "bg-amber-100"
                        : index % 2 === 0
                        ? "bg-gray-50"
                        : "bg-white";

                    return (
                      <tr
                        key={entry.bidder_id || index}
                        className={`border-b ${highlight}`}
                      >
                        <td className="px-4 py-2 font-bold">
                          {entry.rank || index + 1} {getCrownEmoji(entry.rank)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={entry.is_winner ? "font-bold text-green-600" : ""}>
                            {entry.username || "Anonymous"}
                          </span>
                        </td>
                        {isMultiItem && (
                          <td className="px-4 py-2">
                            {entry.item_name || "N/A"}
                          </td>
                        )}
                        <td className="px-4 py-2">
                          <span className={entry.is_winner ? "font-bold text-green-600" : ""}>
                            {typeof entry.bid_amount === "number"
                              ? `$${entry.bid_amount.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {entry.bid_time
                            ? new Date(entry.bid_time).toLocaleString()
                            : "N/A"}
                        </td>
                        {!isMultiItem && (
                          <td className="px-4 py-2">
                            <span className={entry.is_winner ? "text-green-600 font-bold" : ""}>
                              {entry.is_winner ? "Yes" : "No"}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Alert variant="warning" className="text-center">
            <h5>No Leaderboard Data</h5>
            <p>No bidding information available for this auction.</p>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="bg-gray-100 border-t-0">
        <Button
          variant="secondary"
          onClick={() => setShowLeaderboard(false)}
          className="px-4"
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AuctionLeaderboardModal;