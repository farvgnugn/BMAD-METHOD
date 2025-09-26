<!-- Template for Schema Markup Implementation -->

# Schema Markup Template

Use this template to implement structured data that helps both search engines and AI models understand and display your content.

## Essential Schema Types for SEO and AI

### Article Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{Article Title - Primary Keyword}",
  "description": "{Meta description or article summary}",
  "image": {
    "@type": "ImageObject",
    "url": "{Featured image URL}",
    "width": {image_width},
    "height": {image_height}
  },
  "author": {
    "@type": "Person",
    "name": "{Author Name}",
    "url": "{Author profile URL}",
    "jobTitle": "{Author job title}",
    "worksFor": {
      "@type": "Organization",
      "name": "{Company Name}",
      "url": "{Company URL}"
    }
  },
  "publisher": {
    "@type": "Organization",
    "name": "{Company/Site Name}",
    "logo": {
      "@type": "ImageObject",
      "url": "{Logo URL}",
      "width": {logo_width},
      "height": {logo_height}
    }
  },
  "datePublished": "{YYYY-MM-DD}",
  "dateModified": "{YYYY-MM-DD}",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "{Article URL}"
  },
  "articleSection": "{Category/Section}",
  "wordCount": {word_count},
  "keywords": ["{keyword1}", "{keyword2}", "{keyword3}"],
  "about": [
    {
      "@type": "Thing",
      "name": "{Main topic 1}"
    },
    {
      "@type": "Thing",
      "name": "{Main topic 2}"
    }
  ]
}
</script>
```

### FAQ Schema (Critical for AI Citations)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{Question exactly as written in content}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Complete answer text - what AI models will cite}"
      }
    },
    {
      "@type": "Question",
      "name": "{Second question}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Complete answer text}"
      }
    },
    {
      "@type": "Question",
      "name": "{Third question}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{Complete answer text}"
      }
    }
  ]
}
</script>
```

### How-To Schema (For Tutorial Content)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "{How-to title}",
  "description": "{Brief description of what will be accomplished}",
  "image": {
    "@type": "ImageObject",
    "url": "{Tutorial image URL}"
  },
  "estimatedCost": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": "{estimated_cost}"
  },
  "supply": [
    {
      "@type": "HowToSupply",
      "name": "{Supply/tool name}"
    },
    {
      "@type": "HowToSupply",
      "name": "{Supply/tool name}"
    }
  ],
  "tool": [
    {
      "@type": "HowToTool",
      "name": "{Tool name}"
    }
  ],
  "totalTime": "PT{X}M",
  "step": [
    {
      "@type": "HowToStep",
      "name": "{Step 1 title}",
      "text": "{Detailed step instructions}",
      "image": {
        "@type": "ImageObject",
        "url": "{Step image URL}"
      }
    },
    {
      "@type": "HowToStep",
      "name": "{Step 2 title}",
      "text": "{Detailed step instructions}",
      "image": {
        "@type": "ImageObject",
        "url": "{Step image URL}"
      }
    }
  ]
}
</script>
```

### Product Schema (For Product Pages)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{Product Name}",
  "description": "{Product description}",
  "image": [
    "{Product image URL 1}",
    "{Product image URL 2}",
    "{Product image URL 3}"
  ],
  "brand": {
    "@type": "Brand",
    "name": "{Brand Name}"
  },
  "manufacturer": {
    "@type": "Organization",
    "name": "{Manufacturer Name}"
  },
  "offers": {
    "@type": "Offer",
    "url": "{Product URL}",
    "priceCurrency": "USD",
    "price": "{price}",
    "priceValidUntil": "{YYYY-MM-DD}",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "{Seller Name}"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{average_rating}",
    "reviewCount": "{total_reviews}"
  },
  "review": [
    {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": "{rating}",
        "bestRating": "5"
      },
      "author": {
        "@type": "Person",
        "name": "{Reviewer name}"
      },
      "reviewBody": "{Review text}"
    }
  ]
}
</script>
```

### Organization Schema (For About/Company Pages)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "{Company Name}",
  "url": "{Company URL}",
  "logo": "{Logo URL}",
  "description": "{Company description}",
  "foundingDate": "{YYYY-MM-DD}",
  "founder": {
    "@type": "Person",
    "name": "{Founder Name}"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "{phone_number}",
    "contactType": "customer service",
    "availableLanguage": ["English", "{other_languages}"]
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{Street Address}",
    "addressLocality": "{City}",
    "addressRegion": "{State}",
    "postalCode": "{ZIP}",
    "addressCountry": "{Country}"
  },
  "sameAs": [
    "{Social media URL 1}",
    "{Social media URL 2}",
    "{Social media URL 3}"
  ]
}
</script>
```

### Service Schema (For Service-Based Businesses)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "{Service Name}",
  "description": "{Service description}",
  "provider": {
    "@type": "Organization",
    "name": "{Company Name}",
    "url": "{Company URL}"
  },
  "areaServed": {
    "@type": "Place",
    "name": "{Geographic area served}"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "{Service category}",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "{Specific service 1}"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "{Specific service 2}"
        }
      }
    ]
  }
}
</script>
```

## Local Business Schema

### Local Business (For Physical Locations)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "{Business Name}",
  "image": "{Business photo URL}",
  "url": "{Website URL}",
  "telephone": "{Phone number}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{Street Address}",
    "addressLocality": "{City}",
    "addressRegion": "{State}",
    "postalCode": "{ZIP}",
    "addressCountry": "{Country}"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": {latitude},
    "longitude": {longitude}
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
      ],
      "opens": "09:00",
      "closes": "17:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday"],
      "opens": "10:00",
      "closes": "15:00"
    }
  ],
  "priceRange": "{$-$$$$}",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{average_rating}",
    "reviewCount": "{review_count}"
  }
}
</script>
```

### Professional Service Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "{Business Name}",
  "url": "{Website URL}",
  "telephone": "{Phone}",
  "priceRange": "{Price range}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{Address}",
    "addressLocality": "{City}",
    "addressRegion": "{State}",
    "postalCode": "{ZIP}",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": {lat},
    "longitude": {lng}
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday"
    ],
    "opens": "08:00",
    "closes": "18:00"
  },
  "areaServed": [
    "{City 1}",
    "{City 2}",
    "{City 3}"
  ]
}
</script>
```

## Review and Rating Schema

### Review Schema (For Individual Reviews)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Review",
  "itemReviewed": {
    "@type": "{Product/Service/Organization}",
    "name": "{Name of item being reviewed}"
  },
  "reviewRating": {
    "@type": "Rating",
    "ratingValue": "{rating_value}",
    "bestRating": "5",
    "worstRating": "1"
  },
  "name": "{Review title}",
  "author": {
    "@type": "Person",
    "name": "{Author name}"
  },
  "reviewBody": "{Full review text}",
  "datePublished": "{YYYY-MM-DD}"
}
</script>
```

### Aggregate Rating Schema
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{Product/Service Name}",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{average_rating}",
    "reviewCount": "{total_reviews}",
    "bestRating": "5",
    "worstRating": "1"
  }
}
</script>
```

## Event Schema

### Event Schema (For Webinars, Workshops, etc.)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "{Event Name}",
  "description": "{Event description}",
  "startDate": "{YYYY-MM-DDTHH:MM}",
  "endDate": "{YYYY-MM-DDTHH:MM}",
  "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "VirtualLocation",
    "url": "{Event URL}"
  },
  "organizer": {
    "@type": "Organization",
    "name": "{Organizer Name}",
    "url": "{Organizer URL}"
  },
  "offers": {
    "@type": "Offer",
    "url": "{Registration URL}",
    "price": "{Price}",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "validFrom": "{YYYY-MM-DD}"
  },
  "performer": {
    "@type": "Person",
    "name": "{Speaker Name}"
  }
}
</script>
```

## Implementation Guidelines

### Schema Validation
```markdown
**Testing Tools:**
- Google Rich Results Test
- Schema.org Validator
- Bing Markup Validator
- Yandex Structured Data Validator

**Validation Checklist:**
- [ ] No syntax errors
- [ ] Required properties included
- [ ] Recommended properties added where applicable
- [ ] Images have proper dimensions
- [ ] Dates in correct ISO format
- [ ] URLs are absolute, not relative
```

### Best Practices
```markdown
**Schema Implementation:**
- [ ] Place schema in <head> section
- [ ] Use JSON-LD format (preferred by Google)
- [ ] Include only accurate, factual information
- [ ] Match schema data to visible page content
- [ ] Use specific schema types when possible
- [ ] Include image schemas with proper dimensions

**Common Mistakes to Avoid:**
- [ ] Don't markup content not visible to users
- [ ] Don't use schema for deceptive purposes
- [ ] Don't include promotional content in schema
- [ ] Don't use overly generic schema types
- [ ] Don't forget required properties
```

### AI-Specific Schema Considerations
```markdown
**AI Model Preferences:**
- [ ] FAQ schema for question-answer content
- [ ] Article schema with detailed author information
- [ ] How-to schema for instructional content
- [ ] Clear, factual content in schema descriptions
- [ ] Proper entity relationships and connections

**Authority Signals in Schema:**
- [ ] Author credentials and expertise
- [ ] Organization information and credentials
- [ ] Publication dates and update information
- [ ] Source attribution and references
- [ ] Review and rating information
```

### Schema by Content Type

#### Blog Posts/Articles
```markdown
Required Schema: Article, FAQ (if applicable)
Recommended: BreadcrumbList, Organization (publisher)
AI Optimization: Include author expertise, publication date, article topics
```

#### Product Pages
```markdown
Required Schema: Product, Offers
Recommended: Review, AggregateRating, BreadcrumbList
AI Optimization: Detailed product information, pricing, availability
```

#### Service Pages
```markdown
Required Schema: Service or LocalBusiness
Recommended: Review, AggregateRating, FAQ
AI Optimization: Service area, pricing, credentials
```

#### How-to/Tutorial Content
```markdown
Required Schema: HowTo
Recommended: Article, FAQ
AI Optimization: Step-by-step instructions, tools needed, time estimates
```

---

*This template ensures structured data implementation supports both traditional search engine features and AI model understanding.*