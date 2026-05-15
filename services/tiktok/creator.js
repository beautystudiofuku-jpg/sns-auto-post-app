const axios = require('axios');

const CREATOR_INFO_URL = 'https://open.tiktokapis.com/v2/post/publish/creator_info/query/';

async function queryCreatorInfo(accessToken) {
  const response = await axios.post(CREATOR_INFO_URL, {}, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data?.data || {};
}

module.exports = { queryCreatorInfo };
