import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../lib/api';
import { DEFAULTS, type EmergencyContact } from '@nearhelp/shared';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+');
  const [relationship, setRelationship] = useState('');

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ contacts: EmergencyContact[] }>('/contacts');
      setContacts(res.contacts || []);
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a contact name');
      return;
    }
    if (!phone.trim().startsWith('+') || phone.trim().length < 8) {
      Alert.alert('Invalid Phone', 'Phone must be in international format (e.g. +919876543210)');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/contacts', {
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim() || undefined,
      });

      setName('');
      setPhone('+');
      setRelationship('');
      setShowAddModal(false);
      await fetchContacts();
      Alert.alert('Contact Added', `${name.trim()} added to your emergency circle.`);
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert('Error', error.message || 'Failed to add emergency contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = (id: string, contactName: string) => {
    Alert.alert(
      'Remove Emergency Contact',
      `Are you sure you want to remove ${contactName}? They will no longer receive SOS tracking links.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/contacts/${id}`);
              await fetchContacts();
            } catch (err: unknown) {
              const error = err as { message?: string };
              Alert.alert('Error', error.message || 'Failed to remove contact');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Informative Header Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoIcon}>🛡️</Text>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Automated Emergency SMS Alerts</Text>
          <Text style={styles.infoSub}>
            When you trigger SOS, your registered emergency contacts receive an instant SMS with a
            private 24-hour live tracking web link.
          </Text>
        </View>
      </View>

      {/* Counter card */}
      <View style={styles.counterCard}>
        <View>
          <Text style={styles.counterTitle}>Emergency Contacts Circle</Text>
          <Text style={styles.counterSubtitle}>
            {contacts.length} of {DEFAULTS.MAX_EMERGENCY_CONTACTS} contacts added
          </Text>
        </View>

        {contacts.length < DEFAULTS.MAX_EMERGENCY_CONTACTS && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addButtonText}>+ Add Contact</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contacts List */}
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color="#DC2626" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No Emergency Contacts Added</Text>
          <Text style={styles.emptySub}>
            Add up to 5 family members, close friends, or neighbors who should be immediately
            notified when you need emergency help.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.emptyAddButtonText}>Add First Contact</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contactsList}>
          {contacts.map((c) => (
            <View key={c.id} style={styles.contactItem}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarInitial}>
                  {c.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactPhone}>{c.phone}</Text>
                {c.relationship && (
                  <Text style={styles.contactRelation}>{c.relationship}</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteContact(c.id, c.name)}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Contact Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <Text style={styles.modalSubtitle}>
              Contacts will receive live tracking SMS when you trigger SOS.
            </Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Jane Doe"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Phone (with country code)</Text>
            <TextInput
              style={styles.input}
              placeholder="+919876543210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.inputLabel}>Relationship (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Spouse, Parent, Neighbor"
              value={relationship}
              onChangeText={setRelationship}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleAddContact}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Contact</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
  },
  infoSub: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 16,
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  counterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  counterSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  loadingCard: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  emptyAddButton: {
    marginTop: 18,
    backgroundColor: '#DC2626',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  contactsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactAvatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  contactPhone: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  contactRelation: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#9CA3AF',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
