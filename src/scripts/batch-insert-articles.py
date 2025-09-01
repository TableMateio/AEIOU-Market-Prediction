#!/usr/bin/env python3

"""
Batch Insert Articles
Reads the SQL file and outputs it in a format that can be executed manually
"""

import re

def main():
    with open('/tmp/historical_articles_insert_fixed.sql', 'r') as f:
        content = f.read()
    
    # Split by article (each starts with gen_random_uuid())
    articles = re.split(r'(?=\s*\(\s*gen_random_uuid)', content)
    
    # First part is the INSERT statement header
    header = articles[0].strip()
    article_values = articles[1:]  # Skip the header part
    
    print(f"Found {len(article_values)} articles to insert")
    
    # Create batches of 5 articles each
    batch_size = 5
    for i in range(0, len(article_values), batch_size):
        batch = article_values[i:i+batch_size]
        
        # Reconstruct SQL for this batch
        batch_sql = header + "\n" + ",\n".join(batch)
        
        # Ensure proper ending
        if not batch_sql.strip().endswith(';'):
            # Remove any trailing comma and add the ON CONFLICT clause
            batch_sql = re.sub(r',\s*$', '', batch_sql.strip())
            batch_sql += """
ON CONFLICT (url) DO UPDATE SET
    title = EXCLUDED.title,
    summary = EXCLUDED.summary,
    body = COALESCE(EXCLUDED.body, articles.body),
    source = EXCLUDED.source,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();"""
        
        print(f"\n=== BATCH {i//batch_size + 1} ({len(batch)} articles) ===")
        print(batch_sql)
        print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    main()
