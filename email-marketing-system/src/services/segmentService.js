import { supabase } from '../supabase';

const segmentService = {
  getAllSegments: async () => {
    const { data, error } = await supabase
      .from('customer_segments')
      .select('*');

    if (error) {
      throw new Error('Error fetching segments: ' + error.message);
    }

    return data;
  },

  getSegmentById: async (id) => {
    const { data, error } = await supabase
      .from('customer_segments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error('Error fetching segment: ' + error.message);
    }

    return data;
  },

  filterCustomersBySegment: (customers, segmentId) => {
    return customers.filter(customer => customer.segmentId === segmentId);
  },

  addSegment: async (segment) => {
    const { data, error } = await supabase
      .from('customer_segments')
      .insert(segment)
      .select();

    if (error) {
      throw new Error('Error adding segment: ' + error.message);
    }

    return data;
  },

  updateSegment: async (id, updates) => {
    const { data, error } = await supabase
      .from('customer_segments')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error('Error updating segment: ' + error.message);
    }

    return data;
  },

  deleteSegment: async (id) => {
    const { data, error } = await supabase
      .from('customer_segments')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      throw new Error('Error deleting segment: ' + error.message);
    }

    return data;
  }
};

export default segmentService;