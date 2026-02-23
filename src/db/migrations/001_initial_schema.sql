-- Twitter Archive System - Initial Schema
-- Database: twitter_archive

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tweets table
CREATE TABLE IF NOT EXISTS tweets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tweet_url TEXT UNIQUE NOT NULL,
    tweet_id TEXT UNIQUE NOT NULL,
    author_name TEXT,
    author_username TEXT,
    tweet_text TEXT,
    embed_html TEXT,
    tweet_created_at TIMESTAMPTZ,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL
);

-- Tweet-Categories junction table
CREATE TABLE IF NOT EXISTS tweet_categories (
    tweet_id UUID REFERENCES tweets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (tweet_id, category_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(tweet_created_at);
CREATE INDEX IF NOT EXISTS idx_tweets_text ON tweets USING gin(to_tsvector('simple', tweet_text));
CREATE INDEX IF NOT EXISTS idx_tweets_added_at ON tweets(added_at);
