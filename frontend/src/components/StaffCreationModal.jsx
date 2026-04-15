import { useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiCopy } from 'react-icons/fi';
import api from '../utils/api';

const StaffCreationModal = ({ isOpen, onClose, onStaffCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    permissions: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdStaff, setCreatedStaff] = useState(null);
  const [copied, setCopied] = useState(false);

  const permissionOptions = [
    { id: 'manage_chats', label: 'Handle Customer Chats' },
    { id: 'manage_appointments', label: 'Manage Appointments' },
    { id: 'view_analytics', label: 'View Analytics' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/create-staff', {
        name: formData.name,
        email: formData.email,
        permissions: formData.permissions
      });

      setCreatedStaff(response.data);
      onStaffCreated?.(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (createdStaff) {
      const text = `Email: ${createdStaff.email}\nPassword: ${createdStaff.password}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', email: '', permissions: [] });
    setError('');
    setCreatedStaff(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="bg-gradient-to-r from-blue-950 to-blue-900 text-white p-6 rounded-t-lg">
          <h2 className="text-2xl font-bold">
            {createdStaff ? 'Staff Member Created' : 'Create Staff Member'}
          </h2>
        </div>

        <div className="p-6">
          {createdStaff ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="inline-flex items-center gap-2 text-green-800 font-semibold mb-2">
                  <FiCheckCircle className="h-4 w-4" />
                  Staff member created successfully!
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Share these credentials securely with the staff member:
                </p>

                <div className="bg-gray-50 p-3 rounded border border-gray-200 font-mono text-sm space-y-2 mb-4">
                  <div>
                    <span className="text-gray-600">Email: </span>
                    <span className="text-gray-900 font-semibold">{createdStaff.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Password: </span>
                    <span className="text-gray-900 font-semibold">{createdStaff.password}</span>
                  </div>
                </div>

                <button
                  onClick={handleCopyCredentials}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 text-white py-2 rounded transition font-semibold"
                >
                  <FiCopy className="h-4 w-4" />
                  {copied ? 'Copied to Clipboard' : 'Copy Credentials'}
                </button>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="inline-flex items-center gap-2 text-yellow-800 text-sm">
                  <FiAlertTriangle className="h-4 w-4" />
                  <strong>Important:</strong> The password is only shown once. Make sure to save it securely before closing.
                </p>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded transition font-semibold"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-900"
                  placeholder="staff@example.com"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-3">Permissions</label>
                <div className="space-y-2">
                  {permissionOptions.map((perm) => (
                    <label key={perm.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.id)}
                        onChange={() => handlePermissionToggle(perm.id)}
                        className="h-4 w-4 text-blue-900 rounded"
                        disabled={loading}
                      />
                      <span className="ml-2 text-gray-700">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded transition font-semibold disabled:opacity-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white py-2 rounded transition font-semibold disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Staff'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffCreationModal;
