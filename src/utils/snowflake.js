// Twitter Snowflake ID decoder
// Twitter Snowflake epoch: 1288834974657 (Nov 04, 2010 01:42:54.657 UTC)

const TWITTER_EPOCH = 1288834974657n;

export function decodeSnowflake(snowflakeId) {
    const id = BigInt(snowflakeId);
    const timestamp = (id >> 22n) + TWITTER_EPOCH;
    return new Date(Number(timestamp));
}

export function parseTweetId(tweetUrl) {
    const patterns = [
        /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i,
        /(?:twitter\.com|x\.com)\/\w+\/statuses\/(\d+)/i,
    ];
    
    for (const pattern of patterns) {
        const match = tweetUrl.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

export function parseAuthorUsername(tweetUrl) {
    const pattern = /(?:twitter\.com|x\.com)\/(\w+)\/status/i;
    const match = tweetUrl.match(pattern);
    return match ? match[1] : null;
}
