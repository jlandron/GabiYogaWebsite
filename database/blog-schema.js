/**
 * Blog Schema for Gabi Yoga Website
 * 
 * This file defines the MongoDB schema for blog posts.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Blog Post Schema - For website blog posts
 */
const BlogPostSchema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // URL-friendly version of the title
    content: { type: String, required: true },
    excerpt: { type: String }, // Optional short description/preview
    author: { type: String, default: 'Gabi' },
    coverImage: { 
        url: { type: String },
        alt: { type: String }
    },
    images: [{
        url: { type: String, required: true },
        alt: { type: String },
        caption: { type: String }
    }],
    tags: [{ type: String }],
    published: { type: Boolean, default: true },
    publishedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = {
    BlogPostSchema
};
