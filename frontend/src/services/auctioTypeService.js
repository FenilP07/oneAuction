import apiClient from "../utils/apiClient";

const getAllAuctionTypes = async () => {
  try {
    const response = await apiClient.get('/auction/auctionType');
    console.log('getAllAuctionTypes response:', response.data);
    return response.data.data.types || [];
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to fetch auction types';
    console.error('getAllAuctionTypes error:', message);
    throw new Error(message);
  }
};

export default getAllAuctionTypes;