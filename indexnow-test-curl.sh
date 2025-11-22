#!/bin/bash
# IndexNow API Test Request
# This script tests the IndexNow API with your website URLs

curl -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "sharedstudy.vercel.app",
    "key": "8a44be3040e8d0082bebb260a6721525",
    "keyLocation": "https://sharedstudy.vercel.app/8a44be3040e8d0082bebb260a6721525.txt",
    "urlList": [
      "https://sharedstudy.vercel.app/",
      "https://sharedstudy.vercel.app/browse.html",
      "https://sharedstudy.vercel.app/about.html",
      "https://sharedstudy.vercel.app/login.html",
      "https://sharedstudy.vercel.app/signup.html",
      "https://sharedstudy.vercel.app/upload.html"
    ]
  }'

