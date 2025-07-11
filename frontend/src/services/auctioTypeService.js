import apiClient from "../utils/apiClient"

const getAllAuctionTypes = async () => {
try {
    const response =await apiClient.get('auction/auctionType');
   return response.data.data.types;

} catch (error) {
    error.response?.data?.message|| error.message || 'An unexpected error occurred';
    throw new Error(error);
    
}

};

export default getAllAuctionTypes