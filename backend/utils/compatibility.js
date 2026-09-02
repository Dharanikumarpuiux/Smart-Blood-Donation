// Blood compatibility engine.
// Standard red-cross donor/recipient compatibility rules.
//   O- is the universal donor, AB+ is the universal recipient.

// Given a RECIPIENT's blood group, returns the set of DONOR blood types
// that can safely donate to that recipient (includes the exact match).
const getCompatibleDonorTypes = (recipientBloodGroup) => {
  const map = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
  };
  return map[recipientBloodGroup] || [];
};

// Given a DONOR's blood group, returns the RECIPIENT blood types the
// donor can donate to (inverse of the above).
const getCompatibleRecipientTypes = (donorBloodGroup) => {
  const map = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
  };
  return map[donorBloodGroup] || [];
};

module.exports = { getCompatibleDonorTypes, getCompatibleRecipientTypes };