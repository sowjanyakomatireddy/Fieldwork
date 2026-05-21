import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jcevnfiughtkjnyefkvn.supabase.co';
const supabaseAnonKey = 'sb_publishable_nA7m8z0Pv1-O0oU_12RGLQ_GqzGn_sU';

// Switch to local mode since cloud Supabase service is not reachable
export const isLocalMode = true;

// Mock Supabase Client for offline local operations
class MockSupabaseClient {
  private getTable(name: string): any[] {
    const data = localStorage.getItem(`mock_sb_${name}`);
    return data ? JSON.parse(data) : [];
  }

  private saveTable(name: string, data: any[]) {
    localStorage.setItem(`mock_sb_${name}`, JSON.stringify(data));
  }

  from(tableName: string) {
    const client = this;
    
    // Ensure table exists / initial dummy data for a rich initial experience
    let initialData = this.getTable(tableName);
    if (initialData.length === 0) {
      if (tableName === 'visits') {
        initialData = [
          {
            id: 'v1',
            created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
            worker_name: 'Sathya',
            worker_phone: '9876543210',
            client_name: 'Aditya Academy',
            client_type: 'School',
            client_phone: '9000123456',
            address: '',
            landmark: 'Near Main Gate',
            requirements: 'Needs 50 tablets setup and network configuration.',
            budget: 0,
            status: 'follow_up',
            follow_up_at: new Date(Date.now() + 86400000).toISOString(),
            rejection_reason: null,
            latitude: 17.3850,
            longitude: 78.4867,
            photo_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600'
          },
          {
            id: 'v2',
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
            worker_name: 'Sowjanya',
            worker_phone: '9988776655',
            client_name: 'Sathya Corp',
            client_type: 'Corporate Office',
            client_phone: '9123456789',
            address: '',
            landmark: 'Opposite Metro Station',
            requirements: 'Requires server room audit and load balancer config.',
            budget: 150000,
            status: 'converted',
            follow_up_at: null,
            rejection_reason: null,
            latitude: 17.4062,
            longitude: 78.4682,
            photo_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600'
          }
        ];
        this.saveTable('visits', initialData);

        const dummyActivities = [
          {
            id: 'a1',
            visit_id: 'v1',
            action_type: 'created',
            note: 'New visit created with status: follow_up',
            performed_by: 'Sathya',
            created_at: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            id: 'a2',
            visit_id: 'v2',
            action_type: 'created',
            note: 'New visit created with status: converted',
            performed_by: 'Sowjanya',
            created_at: new Date(Date.now() - 3600000 * 24).toISOString()
          }
        ];
        this.saveTable('visit_activities', dummyActivities);
      }
    }

    class QueryBuilder {
      private operation: 'select' | 'insert' | 'update' = 'select';
      private filters: Array<{ column: string; value: any }> = [];
      private orderConfig: { column: string; ascending: boolean } | null = null;
      private payload: any = null;

      select(columns?: string) {
        return this;
      }

      insert(rows: any[]) {
        this.operation = 'insert';
        this.payload = rows;
        return this;
      }

      update(values: any) {
        this.operation = 'update';
        this.payload = values;
        return this;
      }

      eq(column: string, value: any) {
        this.filters.push({ column, value });
        return this;
      }

      order(column: string, { ascending = true } = {}) {
        this.orderConfig = { column, ascending };
        return this;
      }

      async then(onfulfilled?: (value: any) => any) {
        let data = client.getTable(tableName);
        let error = null;
        let resultData: any = null;

        if (this.operation === 'select') {
          // Apply filters
          for (const filter of this.filters) {
            data = data.filter(row => row[filter.column] === filter.value);
          }
          // Apply order
          if (this.orderConfig) {
            const { column, ascending } = this.orderConfig;
            data = [...data].sort((a, b) => {
              const valA = a[column];
              const valB = b[column];
              if (valA < valB) return ascending ? -1 : 1;
              if (valA > valB) return ascending ? 1 : -1;
              return 0;
            });
          }
          resultData = data;
        } else if (this.operation === 'insert') {
          const rows = Array.isArray(this.payload) ? this.payload : [this.payload];
          const newRows = rows.map(row => ({
            id: Math.random().toString(36).substring(2, 15),
            created_at: new Date().toISOString(),
            ...row
          }));
          const updated = [...data, ...newRows];
          client.saveTable(tableName, updated);
          resultData = newRows;
        } else if (this.operation === 'update') {
          const updatedTable = data.map(row => {
            let matches = true;
            for (const filter of this.filters) {
              if (row[filter.column] !== filter.value) {
                matches = false;
                break;
              }
            }
            if (matches) {
              return { ...row, ...this.payload };
            }
            return row;
          });
          client.saveTable(tableName, updatedTable);
          resultData = this.payload;
        }

        return Promise.resolve({ data: resultData, error }).then(onfulfilled);
      }
    }

    return new QueryBuilder();
  }

  storage = {
    from: (bucketName: string) => ({
      upload: async (filePath: string, file: File) => {
        return new Promise<{ data: any, error: any }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            const storageKey = `mock_storage_${bucketName}_${filePath}`;
            localStorage.setItem(storageKey, base64data);
            resolve({ data: { path: filePath }, error: null });
          };
          reader.onerror = () => {
            resolve({ data: null, error: new Error('Failed to read file') });
          };
          reader.readAsDataURL(file);
        });
      },
      getPublicUrl: (filePath: string) => {
        const storageKey = `mock_storage_${bucketName}_${filePath}`;
        const base64data = localStorage.getItem(storageKey);
        return {
          data: {
            publicUrl: base64data || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600'
          }
        };
      }
    })
  };
}

export const supabase = isLocalMode 
  ? (new MockSupabaseClient() as any) 
  : createClient(supabaseUrl, supabaseAnonKey);

export const BUCKET_NAME = 'visit-photos';

console.info("FieldTrack Pro: Offline local mode active via LocalStorage.");
