import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { CSVLink } from 'react-csv';
import Sidebar from '../components/Sidebar';
import styles from '../styles/Historico.module.css';
import { useRouter } from 'next/router';
import axios from 'axios';

interface Reservation {
  id: number;
  usuario: { name: string };
  ambiente_id: number;
  date: string;
  status: string;
}

interface Environment {
  id: number;
  name: string;
}

const Historico: React.FC = () => {
  const URL_API = process.env.NEXT_PUBLIC_API_URL;
  const [historico, setHistorico] = useState<Reservation[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<Reservation[]>([]);
  const [userFilter, setUserFilter] = useState('');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [environmentFilter, setEnvironmentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }

    const fetchHistorico = async () => {
      const response = await axios.get(`${URL_API}/reservas_historico`);
      setHistorico(response.data);
      setFilteredHistory(response.data);
    };
    fetchHistorico();

    const fetchEnvironments = async () => {
      const response = await axios.get(`${URL_API}/ambientes`);
      setEnvironments(response.data);
    };
    fetchEnvironments();
  }, [URL_API, router]);

  useEffect(() => {
    filterHistory();
  }, [userFilter, environmentFilter, startDate, endDate]);

  const filterHistory = () => {
    let filtered = historico;

    if (userFilter !== '') {
      filtered = filtered.filter(reservation =>
        reservation.usuario.name.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    if (environmentFilter !== '') {
      filtered = filtered.filter(reservation =>
        getEnvironmentName(reservation.ambiente_id).toLowerCase().includes(environmentFilter.toLowerCase())
      );
    }

    if (startDate !== '') {
      filtered = filtered.filter(reservation => new Date(reservation.date) >= new Date(startDate));
    }

    if (endDate !== '') {
      filtered = filtered.filter(reservation => new Date(reservation.date) <= new Date(endDate));
    }

    setFilteredHistory(filtered);
    setCurrentPage(1); // Reiniciar para a primeira página após um filtro
  };

  const getEnvironmentName = (ambiente_id: number) => {
    const environment = environments.find(env => env.id === ambiente_id);
    return environment ? environment.name : 'Ambiente não encontrado';
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Histórico de Reservas', 20, 20);
    doc.setFontSize(12);
    filteredHistory.forEach((item, index) => {
      const y = 30 + index * 10;
      doc.text(
        `${item.usuario.name} reservou o ${getEnvironmentName(item.ambiente_id)} no dia ${new Date(item.date).toLocaleDateString(
          'pt-BR'
        )} às ${new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Status: ${item.status}`,
        20,
        y
      );
    });
    doc.save('historico_reservas.pdf');
  };

  // Paginação
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className={styles.historicoContainer} style={{ fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />
      <div className={styles.historicoContent}>
        <h1 className={styles.historicoTitle}>Histórico de Reservas</h1>

        {/* Botões de exportação */}
        <div className={styles.exportButtons}>
          <button onClick={generatePDF} className={styles.pdfButton}>
            Exportar para PDF
          </button>
          <CSVLink data={filteredHistory} filename="historico_reservas.csv" className={styles.csvButton}>
            Exportar para CSV
          </CSVLink>
        </div>

        {/* Barra de filtros */}
        <div className={styles.filtersContainer}>
          <input
            type="text"
            placeholder="Pesquisar por usuário"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className={styles.filterInput}
          />
          <input
            type="text"
            placeholder="Pesquisar por ambiente"
            value={environmentFilter}
            onChange={(e) => setEnvironmentFilter(e.target.value)}
            className={styles.filterInput}
          />
          <div className={styles.dateFilters}>
            <label>
              De:
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.filterInput}
              />
            </label>
            <label>
              Até:
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.filterInput}
              />
            </label>
          </div>
        </div>

        {/* Exibição da tabela de reservas */}
        <table className={styles.reservationTable}>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Ambiente</th>
              <th>Data</th>
              <th>Status</th>
              <th>Período</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((reservation) => (
                <tr key={reservation.id}>
                  <td>{reservation.usuario.name}</td>
                  <td>{getEnvironmentName(reservation.ambiente_id)}</td>
                  <td>{new Date(reservation.date).toLocaleDateString('pt-BR')}</td>
                  <td>{reservation.status}</td>
                  <td>
                    {startDate && endDate
                      ? `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}`
                      : 'Indeterminado'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>Nenhuma reserva encontrada</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginação */}
        <div className={styles.pagination}>
          <button onClick={handlePrevPage} disabled={currentPage === 1} className={styles.paginationButton}>
            Anterior
          </button>
          <span className={styles.paginationInfo}>
            Página {currentPage} de {totalPages}
          </span>
          <button onClick={handleNextPage} disabled={currentPage === totalPages} className={styles.paginationButton}>
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
};

export default Historico;
