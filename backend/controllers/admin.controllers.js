import Item from "../models/items.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIResponse } from "../utils/apiResponse.js";
import logger from "../utils/logger.js";

/**
 * @desc Fetch all items with 'pending_approval' status for admin review
 * @route GET /api/admin/items/pending
 */

/**
 * @desc Fetch all items with 'pending_approval' status for admin review
 *        and return item status stats
 * @route GET /api/admin/items/pending
 */
const getPendingApprovalItems = asyncHandler(async (req, res) => {
  logger.info("Admin request to fetch pending approval items");

  const items = await Item.find({ status: "pending_approval" }).populate("category_id", "name");

  // 🔢 Use aggregation to count items by status
  const statusCounts = await Item.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  //  Format stats
  const stats = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  };

  statusCounts.forEach(({ _id, count }) => {
    stats.total += count;
    if (_id === "available") stats.approved = count;
    else if (_id === "pending_approval") stats.pending = count;
    else if (_id === "rejected") stats.rejected = count;
  });

  logger.info(`Retrieved ${items.length} pending approval items`);

  return res.status(200).json(
    new APIResponse(
      200,
      { items, stats }, // 👈 include both items and stats
      "Pending approval items and stats fetched successfully"
    )
  );
});
// const getPendingApprovalItems = asyncHandler(async (req, res) => {
//   logger.info("Admin request to fetch pending approval items");

//   const items = await Item.find({ status: "pending_approval" }).populate("category_id", "name");

//   if (!items.length) {
//     logger.info("No pending approval items found");
//     return res
//       .status(200)
//       .json(new APIResponse(200, { items: [] }, "No pending approval items found"));
//   }

//   logger.info(`Retrieved ${items.length} pending approval items`);
//   return res
//     .status(200)
//     .json(new APIResponse(200, { items }, "Pending approval items fetched successfully"));
// });

/**
 * @desc Approve or reject an item approval request
 * @route PATCH /api/admin/items/:id/approval
 */
const handleItemApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // expected 'approve' or 'reject'

  logger.info(`Admin approval action requested`, { itemId: id, action });

  const item = await Item.findById(id);
  if (!item) {
    logger.warn("Approval failed: Item not found", { itemId: id });
    throw new apiError(404, "Item not found");
  }

  if (item.status !== "pending_approval") {
    logger.warn("Approval failed: Item not pending approval", { itemId: id });
    throw new apiError(400, "Item is not pending approval");
  }

  if (!["approve", "reject"].includes(action)) {
    logger.warn("Approval failed: Invalid action", { action });
    throw new apiError(400, "Invalid action. Must be 'approve' or 'reject'");
  }

  // Apply action
  item.status = action === "approve" ? "available" : "rejected";
  item.approval_reason = null;
  item.approver_id = req.user._id;

  await item.save();

  logger.info(`Item ${action}d successfully`, { itemId: item._id });

  return res.status(200).json(
    new APIResponse(
      200,
      { item },
      `Item ${action === "approve" ? "approved" : "rejected"} successfully`
    )
  );
});

export { getPendingApprovalItems, handleItemApproval };
