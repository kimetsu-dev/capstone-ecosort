import { useTheme } from '../../contexts/ThemeContext';

export default function UsersTab({ users, setUsers }) {
  const { isDark } = useTheme();

  const bgColor = isDark ? "bg-gray-900" : "bg-white";
  const borderColor = isDark ? "border-gray-700" : "border-slate-200";
  const headerBg = isDark ? "bg-gray-800" : "bg-slate-50";
  const headerText = isDark ? "text-gray-300" : "text-slate-600";
  const rowHover = isDark ? "hover:bg-gray-800" : "hover:bg-slate-50";
  const textPrimary = isDark ? "text-gray-200" : "text-slate-800";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-400";

  const adminBadgeBg = isDark ? "bg-purple-700" : "bg-purple-100";
  const adminBadgeText = isDark ? "text-purple-300" : "text-purple-800";
  const residentBadgeBg = isDark ? "bg-blue-700" : "bg-blue-100";
  const residentBadgeText = isDark ? "text-blue-300" : "text-blue-800";

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-xl font-bold ${textPrimary}`}>Users</h2>
        
        <div className={`text-sm font-medium mb-4 ${textSecondary}`}>
          Total Users: {users.length}
        </div>
      </div>

      <div className={`${bgColor} rounded-xl shadow-sm border ${borderColor} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className={headerBg}>
              <tr>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${headerText}`}>
                  User
                </th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${headerText}`}>
                  Points
                </th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${headerText}`}>
                  Role
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderColor}`}>
              {users.map((user) => (
                <tr key={user.id} className={`${rowHover} transition-colors`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {user.email ? user.email.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div className={`text-sm font-medium ${textPrimary}`}>{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                      {user.totalPoints || 0} points
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                        user.role === "admin" ? `${adminBadgeBg} ${adminBadgeText}` : `${residentBadgeBg} ${residentBadgeText}`
                      }`}
                    >
                      {user.role || "resident"}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className={`text-center py-10 ${textSecondary}`}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
