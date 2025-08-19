using genai as schema from '../db/schema';

service CatalogService {
  entity AppSelection as  select from schema.AppSelection
  {
    *,
    DestinationName
  }
}

